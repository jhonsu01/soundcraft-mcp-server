import { execFile, spawn } from 'child_process';
import { mkdirSync } from 'fs';
import * as net from 'net';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { COMMAND_TIMEOUT_SEC, CONTROL_PORT, connectorDir, resolveInstall } from '../config.js';
import { SoundCraftSession, runCli, withSession } from '../engine.js';
import { toEnginePath } from '../paths.js';
import { READ, collectInputs, errorResult, json, needDir, withPreview } from './common.js';
import { AUDIO_IN, AUDIO_OUT, DRUMS, OUTPUTS, Output, SESSION_EXT, saveOutputs, sessionSummary } from './sessions.js';

interface CommandDef {
  id: string;
  label: string;
  menu?: string[];
  params?: string | null;
  shortcut?: string | null;
}

let commandCache: CommandDef[] | undefined;
/** Every engine command (the engine's list_commands). */
async function engineCommands(): Promise<CommandDef[]> {
  if (!commandCache) commandCache = (await withSession((s) => s.json<CommandDef[]>('list_commands', {}))) ?? [];
  return commandCache;
}

export function controlPortOpen(port = CONTROL_PORT, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ host: '127.0.0.1', port });
    const done = (ok: boolean) => {
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeoutMs, () => done(false));
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
  });
}

function appRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      execFile('tasklist', ['/FI', 'IMAGENAME eq soundcraft.exe', '/NH'], { windowsHide: true }, (err, out) => resolve(!err && /soundcraft\.exe/i.test(out)));
    } else {
      // exact process name: never matches our own soundcraft-cli engines
      execFile('pgrep', ['-xi', 'soundcraft'], (err, out) => resolve(!err && out.trim().length > 0));
    }
  });
}

/** Replace "$steps[N].path.to[0]" with a value returned by step N (0-based), e.g. "$steps[1].tracks[0]". */
export function substitute(value: unknown, steps: unknown[] = []): unknown {
  if (typeof value === 'string') {
    const st = /^\$steps\[(\d+)\]((?:\.[A-Za-z_]\w*|\[\d+\])*)$/.exec(value);
    if (st) {
      let cur: unknown = steps[Number(st[1])];
      for (const part of st[2].match(/\.[A-Za-z_]\w*|\[\d+\]/g) ?? []) {
        const key = part.startsWith('.') ? part.slice(1) : Number(part.slice(1, -1));
        cur = cur && typeof cur === 'object' ? (cur as Record<string | number, unknown>)[key] : undefined;
      }
      if (cur === undefined) throw new Error(`${value} is not available (step results so far: ${steps.length}).`);
      return cur;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, steps));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, steps)]));
  return value;
}

/** Engine tools a step can call by name (anything else is a command id run with `execute`). */
const ENGINE_TOOLS = new Set(['new_session', 'open_session', 'save_session', 'import_audio', 'bounce_mix', 'inspect_session']);

export function registerAdvancedTools(server: McpServer): void {
  server.registerTool(
    'list_soundcraft_catalog',
    {
      title: 'List commands, plugins, drums, formats',
      description:
        'What SoundCraft can do: commands (the engine commands with parameters and menu place, for run_soundcraft_commands), plugins ' +
        '(the built-in effects and instruments with every parameter id, range and unit, for `effects` and `instrument_params`), drums ' +
        '(the drum_synth note names) and formats (read and write).',
      inputSchema: {
        kind: z.enum(['commands', 'plugins', 'drums', 'formats']),
        filter: z.string().optional().describe('Case-insensitive text to match (id, label, menu or category).'),
      },
      annotations: READ,
    },
    async (args) => {
      try {
        const f = (args.filter ?? '').toLowerCase();
        const match = (...parts: unknown[]) => !f || parts.some((p) => String(p ?? '').toLowerCase().includes(f));
        if (args.kind === 'formats') return json({ success: true, read: AUDIO_IN, write: AUDIO_OUT, session: SESSION_EXT, outputs: OUTPUTS, midi: ['mid'] });
        if (args.kind === 'drums') return json({ success: true, instrument: 'drum_synth', notes: DRUMS });
        if (args.kind === 'commands') {
          const l = (await engineCommands()).filter((c) => match(c.id, c.label, (c.menu ?? []).join(' ')));
          return json({ success: true, count: l.length, commands: l.slice(0, 300).map((c) => ({ id: c.id, label: c.label, menu: (c.menu ?? []).join(' › ') || undefined, params: c.params || null })), truncated: l.length > 300 });
        }
        const plugins = ((await withSession((s) => s.cmd('engine.plugins', {}))) ?? []) as {
          id: string;
          name: string;
          category: string;
          instrument: boolean;
          params: { id: string; name: string; min: number; max: number; default: number; unit: string; choices?: string[] }[];
        }[];
        const list = plugins.filter((p) => match(p.id, p.name, p.category));
        return json({
          success: true,
          count: list.length,
          plugins: list.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            instrument: p.instrument,
            params: p.params.map((x) => ({ id: x.id, name: x.name, min: x.min, max: x.max, default: x.default, unit: x.unit, ...(x.choices?.length ? { choices: x.choices } : {}) })),
          })),
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'run_soundcraft_commands',
    {
      title: 'Run SoundCraft engine commands',
      description:
        'Advanced: run any SoundCraft engine commands in order (session.*, file.*, edit.*, track.*, clip.*, mix.*, automation.*, ' +
        'event.* (tempo, meter, key, MIDI edits), midi.*, markers.*, audiosuite.process...) plus the engine tools new_session / ' +
        'open_session / import_audio / inspect_session / bounce_mix / save_session (step id = the tool name), on a new or an opened ' +
        'session, then write outputs. Positions are samples, {"seconds": x} or "bars_beats:5|1|000". Parameters can use ' +
        '"$steps[N].field" for a value returned by step N (0-based). With live=true the steps drive the open SoundCraft app instead.',
      inputSchema: {
        steps: z.array(z.object({ id: z.string(), params: z.record(z.string(), z.any()).optional() })).max(5000).default([]),
        stop_on_error: z.boolean().default(true),
        open_path: z.string().optional().describe('Absolute .scraft session to open first (never saved over; write a copy with formats).'),
        sample_rate: z.number().int().min(8000).max(192000).default(48000).describe('New session rate when there is no open_path.'),
        formats: z.array(z.enum(OUTPUTS)).max(6).optional().describe('Write the result (needs output_dir or output_path).'),
        name: z.string().default('soundcraft'),
        bit_depth: z.enum(['16', '24', '32f']).default('24'),
        normalize: z.boolean().default(false),
        output_dir: z.string().optional(),
        output_path: z.string().optional(),
        overwrite: z.boolean().default(false),
        live: z.boolean().default(false).describe(`Drive the open SoundCraft app (control port ${CONTROL_PORT}) instead of a headless engine.`),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        if (args.live && !(await controlPortOpen())) throw new Error(`SoundCraft is not listening on port ${CONTROL_PORT}: call open_in_soundcraft with control=true first.`);
        const dir = args.formats?.length ? needDir(args) : undefined;
        return await withSession(
          async (s: SoundCraftSession) => {
            if (args.open_path) {
              const [file] = collectInputs([args.open_path], undefined, [SESSION_EXT]);
              await s.json('open_session', { path: toEnginePath(file) });
            } else if (!args.live) await s.json('new_session', { name: args.name, sample_rate: args.sample_rate });
            const values: unknown[] = [];
            const results: Record<string, unknown>[] = [];
            let failed = 0;
            for (const step of args.steps) {
              try {
                const params = substitute(step.params ?? {}, values) as Record<string, unknown>;
                const out = ENGINE_TOOLS.has(step.id) ? await s.json(step.id, params) : await s.cmd(step.id, params);
                values.push(out);
                results.push({ id: step.id, ok: true, result: out });
              } catch (e) {
                failed++;
                values.push(undefined);
                results.push({ id: step.id, ok: false, error: e instanceof Error ? e.message : String(e) });
                if (args.stop_on_error) break;
              }
            }
            let outputs: unknown[] | undefined;
            let mix: unknown;
            let image: { data: string; mimeType: string } | undefined;
            if (args.formats?.length && !failed) {
              const r = await saveOutputs(
                s,
                { stemSource: path.join(dir!, args.name), name: args.name, suffix: '', output_dir: dir, output_path: args.output_path, overwrite: args.overwrite },
                args.formats as Output[],
                { bit_depth: args.bit_depth, normalize: args.normalize },
                true,
              );
              outputs = r.outputs;
              mix = r.analysis;
              image = r.image;
            }
            const session = args.live ? undefined : await sessionSummary(s).catch(() => undefined);
            return withPreview(
              { success: !failed, completed: results.length - failed, failed_steps: failed, results, ...(outputs ? { outputs, mix } : {}), ...(session ? { session } : {}) },
              [image],
              !!failed,
            );
          },
          args.live ? String(CONTROL_PORT) : undefined,
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'open_in_soundcraft',
    {
      title: 'Open in SoundCraft',
      description:
        'Open a .scraft session in the SoundCraft desktop app to listen and keep editing by hand. With control=true the app also starts its ' +
        'loopback-only control channel so run_soundcraft_commands live=true can drive it (play, edit, screenshots).',
      inputSchema: {
        path: z.string().optional().describe('Absolute .scraft session to open (default: an empty session).'),
        demo: z.boolean().default(false).describe('Open the built-in demo song instead.'),
        control: z.boolean().default(false),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        const files = args.path ? collectInputs([args.path], undefined, [SESSION_EXT]) : [];
        const install = resolveInstall();
        if (!install.app) throw new Error('SoundCraft desktop app not found. Set SOUNDCRAFT_DIR (or SOUNDCRAFT_APP).');
        const extra = args.control && !(await controlPortOpen()) ? ['--control', String(CONTROL_PORT)] : [];
        // run it from this connector's folder: GPU drivers drop log folders into the working directory
        const cwd = connectorDir();
        mkdirSync(cwd, { recursive: true });
        const child = spawn(install.app, [...extra, ...(args.demo ? ['--demo'] : []), ...files], { cwd, detached: true, stdio: 'ignore', windowsHide: false });
        child.on('error', () => undefined);
        child.unref();
        let listening: boolean | undefined;
        if (extra.length) {
          const deadline = Date.now() + 20_000;
          while (!(listening = await controlPortOpen()) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 500));
          if (!listening) throw new Error(`SoundCraft started but is not listening on port ${CONTROL_PORT} after 20 s (it may have closed). Start it by hand with: soundcraft --control ${CONTROL_PORT}`);
        }
        return json({ success: true, app: install.app, opened: files, ...(extra.length || args.control ? { control_port: CONTROL_PORT, listening: listening ?? true } : {}) });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'get_soundcraft_status',
    {
      title: 'SoundCraft status',
      description: 'Check the SoundCraft installation: platform, executables, version, engine commands, built-in plugins, Pro Tools feature coverage, formats, whether the app is running / listening for control.',
      inputSchema: {},
      annotations: READ,
    },
    async () => {
      const install = resolveInstall();
      const status: Record<string, unknown> = { ready: !!install.cli, platform: `${install.platform} ${process.arch}`, install_dir: install.dir, cli: install.cli ?? null, app: install.app ?? null };
      try {
        if (!install.cli) throw new Error(`soundcraft-cli not found (searched ${install.searched.length} folders). Install SoundCraft or set SOUNDCRAFT_DIR / SOUNDCRAFT_CLI.`);
        status['version'] = (await runCli(['--version'])).split('\n')[0].trim();
        status['commands'] = (await engineCommands()).length;
        try {
          status['plugins'] = (await runCli(['plugins'])).split('\n').filter((l) => l.trim()).length;
        } catch {
          // older engines
        }
        try {
          const parity = (await runCli(['parity'])).split('\n').find((l) => /\d+\s*%|\d+\s*\/\s*\d+/.test(l));
          if (parity) status['pro_tools_parity'] = parity.replace(/[*#|]/g, ' ').replace(/\s+/g, ' ').trim();
        } catch {
          // older engines without `parity`
        }
        status['app_running'] = await appRunning();
        status['control_port'] = CONTROL_PORT;
        status['control_listening'] = await controlPortOpen();
        status['write_formats'] = [...AUDIO_OUT, SESSION_EXT, 'mid'];
        status['timeout_sec'] = COMMAND_TIMEOUT_SEC;
        return json(status);
      } catch (e) {
        return json({ ...status, ready: false, error: e instanceof Error ? e.message : String(e) }, true);
      }
    },
  );
}
