import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SoundCraftSession, runCli, withSession } from '../engine.js';
import { stemOf, toEnginePath } from '../paths.js';
import { waveformPng } from '../waveform.js';
import { READ, WRITE, collectInputs, errorResult, json, needDir, outputFor, outputSchema, size, targetFor, withPreview } from './common.js';

// ---------------------------------------------------------------- formats

/** Audio SoundCraft reads (import, convert, info). */
export const AUDIO_IN = ['wav', 'wave', 'aif', 'aiff', 'flac', 'mp3', 'ogg', 'oga', 'm4a', 'aac', 'alac', 'caf'];
/** Audio SoundCraft writes. */
export const AUDIO_OUT = ['wav', 'aiff', 'flac'] as const;
export const SESSION_EXT = 'scraft';
/** Every extension a user-given output name may end in. */
const NAME_EXTS = [...AUDIO_IN, SESSION_EXT, 'mid', 'midi'];

export const OUTPUTS = ['wav', 'aiff', 'flac', 'scraft', 'mid', 'stems'] as const;
export type Output = (typeof OUTPUTS)[number];

const formatsSchema = z
  .array(z.enum(OUTPUTS))
  .min(1)
  .max(6)
  .describe(
    'Outputs: wav / aiff / flac (the mixdown), scraft (the editable SoundCraft session; its audio is copied into an "Audio Files" ' +
      'folder beside it), mid (the MIDI of the instrument tracks) and stems (one file per track, in a <name>_stems folder).',
  );

const bounceSchema = {
  bit_depth: z.enum(['16', '24', '32f']).default('24').describe('Bit depth of wav / aiff / flac / stems (flac: 16 or 24).'),
  normalize: z.boolean().default(false).describe('Normalize the mixdown to -0.1 dBFS peak.'),
  start: z.number().min(0).optional().describe('Bounce from this time (seconds; default the session start).'),
  end: z.number().positive().optional().describe('Bounce up to this time (seconds; default the end of the last clip).'),
};

const INSTRUMENTS = ['subtractive_synth', 'drum_synth', 'sampler'] as const;

// ---------------------------------------------------------------- notes

const NOTE_NAMES: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
/** drum_synth plays General MIDI drum notes. */
export const DRUMS: Record<string, number> = {
  kick: 36, snare: 38, rim: 37, clap: 39, hat: 42, closed_hat: 42, hihat: 42, pedal_hat: 44, open_hat: 46,
  floor_tom: 41, low_tom: 45, tom: 47, mid_tom: 47, high_tom: 50, crash: 49, ride: 51,
};

/** 60, "60", "C4" (= 60), "F#3", "Bb5", or a drum name ("kick", "snare", "hat"...). */
export function pitchOf(p: number | string): number {
  if (typeof p === 'number') return Math.round(p);
  const t = p.trim().toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  if (t in DRUMS) return DRUMS[t];
  const m = /^([a-g])([#b]?)(-?\d)$/.exec(t);
  if (!m) throw new Error(`Unknown note "${p}" (use a MIDI number, a name like C4 / F#3 / Bb2, or a drum: ${Object.keys(DRUMS).join(', ')}).`);
  const n = (Number(m[3]) + 1) * 12 + NOTE_NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  if (n < 0 || n > 127) throw new Error(`Note "${p}" is outside MIDI 0-127.`);
  return n;
}

/** SoundCraft's MIDI resolution. */
export const TICKS_PER_QUARTER = 960;

// ---------------------------------------------------------------- schemas

const effectSchema = z.object({
  plugin: z.string().describe('Plugin id: eq_1band, eq_7band, compressor, expander_gate, de_esser, maximizer, channel_strip, room_reverb, plate_reverb, mod_delay, chorus, flanger, phaser, saturator, lofi, pitch_shifter, gain, trim... (list_soundcraft_catalog kind=plugins for parameters).'),
  params: z.record(z.string(), z.number()).optional().describe('Parameter id → value, e.g. {"threshold": -18, "ratio": 4}.'),
});

const mixSchema = {
  name: z.string().optional().describe('Track name.'),
  volume_db: z.number().min(-144).max(12).optional(),
  pan: z.number().min(-1).max(1).optional().describe('-1 left … 1 right.'),
  mute: z.boolean().optional(),
  solo: z.boolean().optional(),
  effects: z.array(effectSchema).max(10).optional().describe('Insert effects, in order.'),
  sends: z.array(z.object({ bus: z.string(), level_db: z.number().min(-144).max(12).default(0) })).max(10).optional().describe('Sends to busses defined in `busses`.'),
};

const noteSchema = z.object({
  pitch: z.union([z.number().int().min(0).max(127), z.string()]).describe('MIDI number, a name (C4 = 60, F#3, Bb2) or, for drum_synth, kick / snare / clap / hat / open_hat / low_tom / mid_tom / high_tom / crash / ride.'),
  start: z.number().min(0).describe('Start in beats (quarter notes) from the start of the clip.'),
  length: z.number().positive().default(1).describe('Length in beats.'),
  velocity: z.number().int().min(1).max(127).default(100),
});

export const trackSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('audio'),
    files: z
      .array(z.object({ path: z.string().describe('Absolute audio file (WAV, AIFF, FLAC, MP3, OGG, M4A/AAC, ALAC, CAF).'), at: z.number().min(0).default(0).describe('Start time (seconds).') }))
      .min(1)
      .max(100)
      .describe('Clips on this track, placed at their times.'),
    clip_gain_db: z.number().min(-60).max(24).optional().describe('Gain of every clip on the track.'),
    fade_in: z.number().min(0).optional().describe('Fade-in of each clip (seconds).'),
    fade_out: z.number().min(0).optional().describe('Fade-out of each clip (seconds).'),
    ...mixSchema,
  }),
  z.object({
    type: z.literal('instrument'),
    instrument: z.enum(INSTRUMENTS).default('subtractive_synth').describe('subtractive_synth (melodies, basses, pads), drum_synth (General MIDI drums) or sampler (plays `sample`).'),
    sample: z.string().optional().describe('sampler: absolute audio file it plays (root note C4).'),
    instrument_params: z.record(z.string(), z.number()).optional().describe('Instrument parameters (list_soundcraft_catalog kind=plugins).'),
    at: z.number().min(0).default(0).describe('Start time of the MIDI clip (seconds).'),
    notes: z.array(noteSchema).max(5000).default([]),
    bars: z.number().int().min(1).max(512).optional().describe('Clip length in bars (default: up to the last note, rounded up to a bar).'),
    repeat: z.number().int().min(1).max(256).default(1).describe('Play the clip this many times in a row (loops).'),
    ...mixSchema,
  }),
  z.object({
    type: z.literal('midi_file'),
    path: z.string().describe('Absolute Standard MIDI File (.mid): its tracks become instrument tracks.'),
    at: z.number().min(0).default(0),
  }),
]);
export type TrackSpec = z.infer<typeof trackSchema>;

const sessionSchema = {
  tempo: z.number().min(20).max(400).optional().describe('Tempo in BPM (default 120).'),
  meter_numerator: z.number().int().min(1).max(32).optional().describe('Time signature top (default 4).'),
  meter_denominator: z.number().int().min(1).max(32).optional().describe('Time signature bottom (default 4).'),
  key: z.string().optional().describe('Key, e.g. "C major", "A minor".'),
  busses: z
    .array(z.object({ name: z.string(), effects: z.array(effectSchema).max(10).optional(), volume_db: z.number().min(-144).max(12).optional() }))
    .max(20)
    .optional()
    .describe('Aux busses (e.g. a shared reverb) that tracks send to.'),
  markers: z.array(z.object({ name: z.string(), at: z.number().min(0) })).max(500).optional().describe('Markers (seconds).'),
};

// ---------------------------------------------------------------- session building

const secs = (s: number) => ({ seconds: s });

interface Track {
  id: number;
  name: string;
  kind: string;
  clips: { id: number; start: number; end: number }[];
}

async function tracksOf(s: SoundCraftSession): Promise<Track[]> {
  const sess = await s.json('inspect_session', { detail: 'summary' });
  return (sess?.tracks ?? []).map((t: any) => ({ id: t.id, name: t.name, kind: t.kind, clips: (t.clips ?? []).map((c: any) => ({ id: c.id, start: c.start, end: c.end })) }));
}

interface MixSettings {
  name?: string;
  volume_db?: number;
  pan?: number;
  mute?: boolean;
  solo?: boolean;
  effects?: z.infer<typeof effectSchema>[];
  sends?: { bus: string; level_db: number }[];
}

async function applyMix(s: SoundCraftSession, id: number, t: MixSettings, warnings: string[]): Promise<void> {
  if (t.name) await s.cmd('track.rename', { track: id, name: t.name });
  if (t.volume_db !== undefined) await s.cmd('mix.volume', { tracks: [id], db: t.volume_db });
  if (t.pan !== undefined) {
    // a stereo track has a pan knob per side: move both (balance), clamped to the edges
    const tr = ((await s.json('inspect_session', { detail: 'summary' }))?.tracks ?? []).find((x: any) => x.id === id);
    if ((tr?.pan ?? []).length === 2) {
      await s.cmd('mix.pan', { tracks: [id], pan: Math.max(-1, Math.min(1, -1 + t.pan)), index: 0 });
      await s.cmd('mix.pan', { tracks: [id], pan: Math.max(-1, Math.min(1, 1 + t.pan)), index: 1 });
    } else await s.cmd('mix.pan', { tracks: [id], pan: t.pan });
  }
  if (t.mute !== undefined) await s.cmd('mix.mute', { tracks: [id], value: t.mute });
  if (t.solo !== undefined) await s.cmd('mix.solo', { tracks: [id], value: t.solo });
  for (const [slot, fx] of (t.effects ?? []).entries()) {
    await s.cmd('mix.insert', { track: id, slot, plugin: fx.plugin, ...(fx.params ? { params: fx.params } : {}) });
  }
  for (const [slot, send] of (t.sends ?? []).entries()) {
    await s.cmd('mix.send', { track: id, slot, bus: send.bus, level_db: send.level_db }).catch((e) => warnings.push(`send to ${send.bus}: ${e instanceof Error ? e.message : e}`));
  }
}

/** Add one track (and its clips) to the open session; returns the new track ids. */
export async function addTrack(s: SoundCraftSession, t: TrackSpec, warnings: string[], sampleRate: number, bpm: number, beatsPerBar: number): Promise<number[]> {
  if (t.type === 'midi_file') {
    const [file] = collectInputs([t.path]);
    const before = new Set((await tracksOf(s)).map((x) => x.id));
    await s.cmd('file.import_midi', { path: toEnginePath(file), at: secs(t.at) });
    return (await tracksOf(s)).filter((x) => !before.has(x.id)).map((x) => x.id);
  }
  if (t.type === 'audio') {
    const files = t.files.map((f) => ({ ...f, path: collectInputs([f.path])[0] }));
    let track: number | undefined;
    const clips: { id: number; frames: number; at: number }[] = [];
    for (const f of files) {
      const r = await s.json('import_audio', { path: toEnginePath(f.path), at: secs(f.at), ...(track !== undefined ? { track } : {}) });
      const imp = r?.imported?.[0];
      if (!imp) throw new Error(`import_audio returned nothing for ${f.path}`);
      track ??= imp.track;
      clips.push({ id: imp.clip, frames: imp.frames, at: f.at });
    }
    if (t.clip_gain_db !== undefined) await s.cmd('clip.gain', { clips: clips.map((c) => c.id), db: t.clip_gain_db });
    for (const c of clips) {
      const len = c.frames / sampleRate;
      if (t.fade_in) await s.cmd('edit.fades_create', { tracks: [track], start: secs(c.at), end: secs(c.at + Math.min(t.fade_in, len / 2)) });
      if (t.fade_out) await s.cmd('edit.fades_create', { tracks: [track], start: secs(c.at + len - Math.min(t.fade_out, len / 2)), end: secs(c.at + len) });
    }
    await applyMix(s, track!, t, warnings);
    return [track!];
  }
  // instrument
  const r = await s.cmd('track.new', { kind: 'instrument', instrument: t.instrument === 'sampler' ? 'subtractive_synth' : t.instrument, ...(t.name ? { name: t.name } : {}) });
  const id: number = r?.tracks?.[0];
  if (id === undefined) throw new Error('track.new returned no track.');
  if (t.instrument === 'sampler') {
    if (!t.sample) throw new Error('An instrument track with instrument=sampler needs `sample` (an audio file).');
    const [file] = collectInputs([t.sample]);
    await s.cmd('mix.sampler_load', { track: id, path: toEnginePath(file) });
  }
  if (t.instrument_params && Object.keys(t.instrument_params).length) {
    await s.cmd('mix.instrument', { track: id, plugin: t.instrument, params: t.instrument_params });
  }
  const lastBeat = t.notes.reduce((m, n) => Math.max(m, n.start + n.length), 0);
  const bars = t.bars ?? Math.max(1, Math.ceil(lastBeat / beatsPerBar - 1e-9));
  const clipSeconds = (bars * beatsPerBar * 60) / bpm;
  const clip = await s.cmd('midi.new_clip', { track: id, start: secs(t.at), length: secs(clipSeconds) });
  const clipId: number = clip?.clip;
  for (const n of t.notes) {
    await s.cmd('midi.note_add', {
      clip: clipId,
      pitch: pitchOf(n.pitch),
      start_ticks: Math.round(n.start * TICKS_PER_QUARTER),
      length_ticks: Math.max(1, Math.round(n.length * TICKS_PER_QUARTER)),
      velocity: n.velocity,
    });
  }
  if (t.repeat > 1) await s.cmd('clip.loop', { clips: [clipId], count: t.repeat });
  await applyMix(s, id, t, warnings);
  return [id];
}

/** Tempo, meter, key, busses and markers. */
async function applySessionSettings(s: SoundCraftSession, a: { tempo?: number; meter_numerator?: number; meter_denominator?: number; key?: string; busses?: { name: string; effects?: z.infer<typeof effectSchema>[]; volume_db?: number }[]; markers?: { name: string; at: number }[] }, warnings: string[]): Promise<void> {
  if (a.tempo) await s.cmd('event.tempo', { bpm: a.tempo });
  if (a.meter_numerator || a.meter_denominator) await s.cmd('event.meter', { numerator: a.meter_numerator ?? 4, denominator: a.meter_denominator ?? 4 });
  if (a.key) await s.cmd('event.add_key_change', { key: a.key }).catch((e) => warnings.push(`key: ${e instanceof Error ? e.message : e}`));
  for (const b of a.busses ?? []) {
    // a return: the bus the tracks send to, and an aux track of the same name that takes it as its input and holds the effects
    await s.cmd('mix.new_bus', { name: b.name });
    const aux = (await s.cmd('track.new', { kind: 'aux', name: b.name, format: 'stereo' }))?.tracks?.[0];
    if (aux === undefined) throw new Error(`bus ${b.name}: track.new returned no aux track.`);
    await s.cmd('track.input', { tracks: [aux], input: b.name });
    await applyMix(s, aux, { effects: b.effects, volume_db: b.volume_db }, warnings);
  }
  for (const m of a.markers ?? []) await s.cmd('markers.add', { name: m.name, at: secs(m.at) });
}

export interface Saved {
  path: string;
  format: string;
  bytes?: number;
  files?: string[];
  peak_db?: number;
  true_peak_db?: number;
  lufs?: number;
  seconds?: number;
}

/** Write the session's outputs; returns them plus the mix analysis (peak, LUFS) and, optionally, a waveform preview. */
export async function saveOutputs(
  s: SoundCraftSession,
  base: { stemSource: string; name?: string; suffix: string; output_dir?: string; output_path?: string; overwrite?: boolean },
  formats: Output[],
  o: { bit_depth: string; normalize: boolean; start?: number; end?: number },
  preview: boolean,
): Promise<{ outputs: Saved[]; analysis?: Record<string, unknown>; image?: { data: string; mimeType: string } }> {
  const b = { ...base, exts: NAME_EXTS };
  const range = { ...(o.start !== undefined ? { start: secs(o.start) } : {}), ...(o.end !== undefined ? { end: secs(o.end) } : {}) };
  const outputs: Saved[] = [];
  let analysis: Record<string, unknown> | undefined;
  let wavForPreview: string | undefined;
  for (const [i, f] of formats.entries()) {
    if (f === 'stems') {
      if (i === 0 && base.output_path) throw new Error('output_path cannot name the stems (a folder); use output_dir or put another format first.');
      const marker = targetFor(i, 'stems', b, '_stems');
      const dir = marker.replace(/\.stems$/, '');
      if (existsSync(dir) && !base.overwrite) throw new Error(`Folder already exists (set overwrite: true): ${dir}`);
      mkdirSync(dir, { recursive: true });
      const r = await s.cmd('file.bounce_stems', { dir: toEnginePath(dir), format: 'wav', bit_depth: o.bit_depth, ...range });
      outputs.push({ path: dir, format: 'stems', files: (r?.files ?? []).map((x: string) => path.resolve(x)) });
      continue;
    }
    const ext = f === 'mid' ? 'mid' : f;
    const out = targetFor(i, ext, b);
    if (f === 'scraft') {
      await s.json('save_session', { path: toEnginePath(out), replace: !!base.overwrite });
      outputs.push({ path: out, format: f, bytes: size(out) });
    } else if (f === 'mid') {
      await s.cmd('file.export_midi', { path: toEnginePath(out) });
      outputs.push({ path: out, format: f, bytes: size(out) });
    } else {
      const bd = f === 'flac' && o.bit_depth === '32f' ? '24' : o.bit_depth;
      const r = await s.json('bounce_mix', { path: toEnginePath(out), format: f, bit_depth: bd, normalize: o.normalize, ...range });
      analysis ??= { peak_db: round(r?.peak_db), true_peak_db: round(r?.true_peak_db), lufs: round(r?.lufs), seconds: round(r?.seconds) };
      outputs.push({ path: out, format: f, bytes: size(out) });
      if (f === 'wav') wavForPreview ??= out;
    }
  }
  let image: { data: string; mimeType: string } | undefined;
  if (preview || !analysis) {
    // the mix once more as a temporary 16-bit WAV: analysis (when no audio format was asked for) and the waveform picture
    const tmp = path.join(s.workDir, 'preview.wav');
    if (!wavForPreview || !analysis) {
      const r = await s.json('bounce_mix', { path: toEnginePath(tmp), format: 'wav', bit_depth: '16', normalize: o.normalize, ...range });
      analysis ??= { peak_db: round(r?.peak_db), true_peak_db: round(r?.true_peak_db), lufs: round(r?.lufs), seconds: round(r?.seconds) };
      wavForPreview ??= tmp;
    }
    if (preview) image = { data: waveformPng(wavForPreview).png.toString('base64'), mimeType: 'image/png' };
  }
  return { outputs, analysis, image };
}

const round = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : v);

/** A compact view of the session: tracks with clips, inserts, sends and mixer, busses, markers, tempo. */
export async function sessionSummary(s: SoundCraftSession, sampleRate?: number): Promise<Record<string, unknown>> {
  const sess = await s.json('inspect_session', { detail: 'summary' });
  const sr = sampleRate ?? sess?.sample_rate ?? 48000;
  const t = (v: number) => Math.round((v / sr) * 1000) / 1000;
  return {
    name: sess?.name,
    sample_rate: sess?.sample_rate,
    length_seconds: t(sess?.length_samples ?? 0),
    tempo: sess?.tempo?.map((x: any) => x.bpm),
    meter: sess?.meter?.map((m: any) => `${m.numerator}/${m.denominator}`),
    tracks: (sess?.tracks ?? []).map((tr: any) => ({
      id: tr.id,
      name: tr.name,
      kind: tr.kind,
      ...(tr.instrument ? { instrument: tr.instrument } : {}),
      volume_db: tr.volume_db,
      pan: tr.pan,
      ...(tr.mute ? { mute: true } : {}),
      ...(tr.solo ? { solo: true } : {}),
      inserts: (tr.inserts ?? []).map((i: any) => i?.plugin ?? i?.id ?? i),
      sends: (tr.sends ?? []).map((x: any) => {
        const bus = x?.target?.Bus;
        const name = (sess?.busses ?? []).find((b: any) => b.id === bus)?.name ?? bus ?? x?.bus;
        return { bus: name, level_db: x?.level_db, ...(x?.pre_fader ? { pre_fader: true } : {}), ...(x?.mute ? { mute: true } : {}) };
      }),
      clips: (tr.clips ?? []).map((c: any) => ({ id: c.id, name: c.name, start: t(c.start), end: t(c.end), ...(c.notes !== undefined ? { notes: c.notes } : {}), ...(c.gain_db ? { gain_db: c.gain_db } : {}) })),
    })),
    busses: (sess?.busses ?? []).map((b: any) => b?.name ?? b),
    markers: (sess?.markers ?? []).map((m: any) => ({ name: m.name, at: t(m.start ?? m.at ?? 0) })),
  };
}

// ---------------------------------------------------------------- tools

export function registerSessionTools(server: McpServer): void {
  server.registerTool(
    'create_session',
    {
      title: 'Create a multitrack session',
      description:
        'Build a song, podcast or soundtrack with SoundCraft (a Pro Tools-class DAW) and mix it down: audio tracks from files placed ' +
        'at times (clip gain, fades), instrument tracks played by the built-in subtractive synth, General MIDI drum synth or a sampler from ' +
        'notes in beats, imported MIDI files, per-track volume, pan, mute, solo, insert effects (EQ, compressor, reverb, delay, chorus, ' +
        'saturation...) and sends to aux busses, tempo, meter, key and markers. Writes the mixdown (wav, aiff, flac), the stems, the MIDI and ' +
        'the editable .scraft session, reports peak and integrated loudness (LUFS) and returns a waveform picture of the mix.',
      inputSchema: {
        name: z.string().default('session').describe('File name without extension.'),
        sample_rate: z.number().int().min(8000).max(192000).default(48000),
        ...sessionSchema,
        tracks: z.array(trackSchema).min(1).max(128),
        formats: formatsSchema.default(['wav', 'scraft']),
        ...bounceSchema,
        ...outputSchema,
        preview: z.boolean().default(true).describe('Return a waveform picture of the mix.'),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const dir = needDir(args);
        return await withSession(async (s) => {
          const warnings: string[] = [];
          await s.json('new_session', { name: args.name.replace(/\.[^.]+$/, ''), sample_rate: args.sample_rate });
          await applySessionSettings(s, args, warnings);
          const bpm = args.tempo ?? 120;
          const beatsPerBar = ((args.meter_numerator ?? 4) * 4) / (args.meter_denominator ?? 4);
          for (const t of args.tracks) await addTrack(s, t, warnings, args.sample_rate, bpm, beatsPerBar);
          const { outputs, analysis, image } = await saveOutputs(
            s,
            { stemSource: path.join(dir, args.name), name: args.name, suffix: '', output_dir: dir, output_path: args.output_path, overwrite: args.overwrite },
            args.formats,
            args,
            args.preview,
          );
          const summary = await sessionSummary(s, args.sample_rate);
          return withPreview({ success: true, outputs, ...(analysis ? { mix: analysis } : {}), session: summary, ...(warnings.length ? { warnings } : {}) }, [image]);
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'edit_session',
    {
      title: 'Edit a SoundCraft session',
      description:
        'Open a .scraft session (or start from audio files) and change it: tempo, meter, key, markers, busses, add tracks (audio, instrument, ' +
        'MIDI file), change existing tracks by name (rename, volume, pan, mute, solo, add effects and sends), remove tracks, then write a new ' +
        'mixdown, stems, MIDI or a new copy of the session. The original session is never changed.',
      inputSchema: {
        input_path: z.string().describe('Absolute .scraft session.'),
        ...sessionSchema,
        add_tracks: z.array(trackSchema).max(128).optional(),
        change_tracks: z
          .array(z.object({ track: z.string().describe('Name of the existing track.'), ...mixSchema }))
          .max(128)
          .optional()
          .describe('Changes to existing tracks; `name` renames.'),
        remove_tracks: z.array(z.string()).max(128).optional().describe('Names of tracks to delete.'),
        formats: formatsSchema.default(['scraft', 'wav']),
        suffix: z.string().default('_edited').describe('Added to the input name for outputs.'),
        ...bounceSchema,
        ...outputSchema,
        preview: z.boolean().default(true),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const [file] = collectInputs([args.input_path], undefined, [SESSION_EXT]);
        return await withSession(async (s) => {
          const warnings: string[] = [];
          const opened = await s.json('open_session', { path: toEnginePath(file) });
          if (opened?.missing?.length) warnings.push(`media not found: ${opened.missing.join(', ')}`);
          await applySessionSettings(s, args, warnings);
          const sess = await s.json('inspect_session', { detail: 'summary' });
          const sr = sess?.sample_rate ?? 48000;
          const bpm = args.tempo ?? sess?.tempo?.[0]?.bpm ?? 120;
          const meter = sess?.meter?.[0];
          const beatsPerBar = ((args.meter_numerator ?? meter?.numerator ?? 4) * 4) / (args.meter_denominator ?? meter?.denominator ?? 4);
          const byName = async (name: string) => {
            const t = (await tracksOf(s)).find((x) => x.name === name) ?? (await tracksOf(s)).find((x) => x.name.toLowerCase() === name.toLowerCase());
            if (!t) throw new Error(`No track named "${name}" (tracks: ${(await tracksOf(s)).map((x) => x.name).join(', ')}).`);
            return t;
          };
          for (const name of args.remove_tracks ?? []) await s.cmd('track.delete', { tracks: [(await byName(name)).id] });
          for (const c of args.change_tracks ?? []) {
            const t = await byName(c.track);
            const existing = ((await s.json('inspect_session', { detail: 'summary' }))?.tracks ?? []).find((x: any) => x.id === t.id);
            const firstSlot = (existing?.inserts ?? []).length;
            const { effects, sends, ...rest } = c;
            await applyMix(s, t.id, rest, warnings);
            for (const [i, fx] of (effects ?? []).entries()) await s.cmd('mix.insert', { track: t.id, slot: firstSlot + i, plugin: fx.plugin, ...(fx.params ? { params: fx.params } : {}) });
            const firstSend = (existing?.sends ?? []).length;
            for (const [i, send] of (sends ?? []).entries()) await s.cmd('mix.send', { track: t.id, slot: firstSend + i, bus: send.bus, level_db: send.level_db });
          }
          for (const t of args.add_tracks ?? []) await addTrack(s, t, warnings, sr, bpm, beatsPerBar);
          const { outputs, analysis, image } = await saveOutputs(
            s,
            { stemSource: file, suffix: args.suffix, output_dir: args.output_dir, output_path: args.output_path, overwrite: args.overwrite },
            args.formats,
            args,
            args.preview,
          );
          return withPreview({ success: true, input: file, outputs, ...(analysis ? { mix: analysis } : {}), session: await sessionSummary(s), ...(warnings.length ? { warnings } : {}) }, [image]);
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'export_session',
    {
      title: 'Export SoundCraft sessions',
      description:
        'Mix down one .scraft session, a list or every session in a folder: wav / aiff / flac mixdown (range, normalize, bit depth), stems ' +
        '(one file per track), MIDI, with peak and loudness (LUFS) of each mix.',
      inputSchema: {
        input_path: z.string().optional(),
        input_paths: z.array(z.string()).max(200).optional(),
        input_dir: z.string().optional().describe('Every .scraft directly in this folder.'),
        formats: formatsSchema.default(['wav']),
        ...bounceSchema,
        ...outputSchema,
        preview: z.boolean().default(false).describe('Return a waveform picture of the first mix.'),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const files = collectInputs([...(args.input_path ? [args.input_path] : []), ...(args.input_paths ?? [])], args.input_dir, [SESSION_EXT]);
        if (files.length > 1 && args.output_path) throw new Error('output_path only works with one session; use output_dir.');
        const results: unknown[] = [];
        let first: { data: string; mimeType: string } | undefined;
        for (const [i, file] of files.entries()) {
          try {
            results.push(
              await withSession(async (s) => {
                const opened = await s.json('open_session', { path: toEnginePath(file) });
                const r = await saveOutputs(s, { stemSource: file, suffix: '', output_dir: args.output_dir, output_path: args.output_path, overwrite: args.overwrite }, args.formats, args, args.preview && i === 0);
                first ??= r.image;
                return { input: file, success: true, outputs: r.outputs, ...(r.analysis ? { mix: r.analysis } : {}), ...(opened?.missing?.length ? { missing_media: opened.missing } : {}) };
              }),
            );
          } catch (e) {
            results.push({ input: file, success: false, error: e instanceof Error ? e.message : String(e) });
          }
        }
        const failed = results.filter((r: any) => !r.success).length;
        return withPreview({ success: failed === 0, processed: files.length, failed, results }, [first], failed === files.length);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'process_audio',
    {
      title: 'Process audio files',
      description:
        'Run audio files (one, a list or a folder) through SoundCraft: trim, AudioSuite processing (normalize to a peak, gain, reverse, ' +
        'invert, pitch shift in semitones, time stretch keeping the pitch, varispeed), insert effects (EQ, compressor, gate, de-esser, ' +
        'maximizer, reverb, delay, chorus, flanger, phaser, saturation, lo-fi...), fades, volume and pan, then write WAV, AIFF or FLAC at ' +
        'any bit depth, with peak and loudness (LUFS). Inputs are only read.',
      inputSchema: {
        input_path: z.string().optional(),
        input_paths: z.array(z.string()).max(500).optional(),
        input_dir: z.string().optional().describe('Every audio file directly in this folder.'),
        trim_start: z.number().min(0).optional().describe('Keep from this time (seconds).'),
        trim_end: z.number().positive().optional().describe('Keep up to this time (seconds).'),
        normalize_db: z.number().min(-60).max(0).optional().describe('Normalize the peak to this level (dBFS), before the effects.'),
        gain_db: z.number().min(-60).max(24).optional(),
        reverse: z.boolean().optional(),
        invert: z.boolean().optional().describe('Invert the polarity.'),
        pitch_semitones: z.number().min(-24).max(24).optional().describe('Pitch shift keeping the length.'),
        stretch: z.number().min(0.25).max(4).optional().describe('Time stretch keeping the pitch: 2 = twice as long.'),
        speed: z.number().min(0.25).max(4).optional().describe('Varispeed (pitch and length change together): 2 = twice as fast.'),
        effects: z.array(effectSchema).max(10).optional().describe('Insert effects, in order (rendered into the output).'),
        fade_in: z.number().min(0).optional(),
        fade_out: z.number().min(0).optional(),
        volume_db: z.number().min(-60).max(12).optional(),
        pan: z.number().min(-1).max(1).optional(),
        format: z.enum(AUDIO_OUT).default('wav'),
        bit_depth: z.enum(['16', '24', '32f']).default('24'),
        sample_rate: z.number().int().min(8000).max(192000).optional().describe('Output rate (default: the file\'s own).'),
        suffix: z.string().default('_processed'),
        ...outputSchema,
        preview: z.boolean().default(true).describe('Return a waveform picture of the first result.'),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const files = collectInputs([...(args.input_path ? [args.input_path] : []), ...(args.input_paths ?? [])], args.input_dir, AUDIO_IN);
        if (files.length > 1 && args.output_path) throw new Error('output_path only works with one file; use output_dir.');
        const results: unknown[] = [];
        let first: { data: string; mimeType: string } | undefined;
        for (const [i, file] of files.entries()) {
          try {
            results.push(
              await withSession(async (s) => {
                const rate = args.sample_rate ?? (await audioInfo(file)).sample_rate ?? 48000;
                await s.json('new_session', { name: stemOf(file), sample_rate: rate });
                const imp = (await s.json('import_audio', { path: toEnginePath(file), at: secs(0) }))?.imported?.[0];
                if (!imp) throw new Error('import_audio returned nothing.');
                const clips = [imp.clip];
                const track = imp.track;
                const proc = async (process: string, params?: Record<string, number>) => {
                  const r = await s.cmd('audiosuite.process', { process, clips: (await tracksOf(s)).find((t) => t.id === track)!.clips.map((c) => c.id), ...(params ? { params } : {}) });
                  return r;
                };
                if (args.normalize_db !== undefined) await proc('normalize', { target_db: args.normalize_db });
                if (args.gain_db !== undefined) await proc('gain', { db: args.gain_db });
                if (args.reverse) await proc('reverse');
                if (args.invert) await proc('invert');
                if (args.pitch_semitones) await proc('pitch_shift', { semitones: args.pitch_semitones });
                if (args.stretch && args.stretch !== 1) await proc('time_stretch', { ratio: args.stretch });
                if (args.speed && args.speed !== 1) await proc('varispeed', { speed: args.speed });
                const clip = (await tracksOf(s)).find((t) => t.id === track)!.clips;
                const len = (clip.reduce((m, c) => Math.max(m, c.end), 0) - clip.reduce((m, c) => Math.min(m, c.start), Infinity)) / rate;
                const start = Math.min(args.trim_start ?? 0, len);
                const end = Math.max(start, Math.min(args.trim_end ?? len, len));
                if (end - start < 0.001) throw new Error(`Nothing left after trimming (the audio lasts ${round(len)} s).`);
                // trim the clip itself, so the fades land on its new edges
                if (start > 0 || end < len) await s.cmd('edit.trim_to_selection', { tracks: [track], start: secs(start), end: secs(end) });
                if (args.fade_in) await s.cmd('edit.fades_create', { tracks: [track], start: secs(start), end: secs(start + Math.min(args.fade_in, (end - start) / 2)) });
                if (args.fade_out) await s.cmd('edit.fades_create', { tracks: [track], start: secs(end - Math.min(args.fade_out, (end - start) / 2)), end: secs(end) });
                const warnings: string[] = [];
                await applyMix(s, track, { volume_db: args.volume_db, pan: args.pan, effects: args.effects }, warnings);
                const out = outputFor(file, args.format, args.suffix, args);
                const bd = args.format === 'flac' && args.bit_depth === '32f' ? '24' : args.bit_depth;
                const r = await s.json('bounce_mix', { path: toEnginePath(out), format: args.format, bit_depth: bd, start: secs(start), end: secs(end) });
                if (args.preview && i === 0) {
                  let wav = out;
                  if (args.format !== 'wav') {
                    wav = path.join(s.workDir, 'preview.wav');
                    await s.json('bounce_mix', { path: toEnginePath(wav), format: 'wav', bit_depth: '16', start: secs(start), end: secs(end) });
                  }
                  first = { data: waveformPng(wav).png.toString('base64'), mimeType: 'image/png' };
                }
                return {
                  input: file,
                  success: true,
                  output: out,
                  bytes: size(out),
                  seconds: round(r?.seconds),
                  peak_db: round(r?.peak_db),
                  true_peak_db: round(r?.true_peak_db),
                  lufs: round(r?.lufs),
                  ...(warnings.length ? { warnings } : {}),
                };
              }),
            );
          } catch (e) {
            results.push({ input: file, success: false, error: e instanceof Error ? e.message : String(e) });
          }
        }
        const failed = results.filter((r: any) => !r.success).length;
        return withPreview({ success: failed === 0, processed: files.length, failed, results }, [first], failed === files.length);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'convert_audio',
    {
      title: 'Convert audio files',
      description:
        'Convert audio files (one, a list or a folder; WAV, AIFF, FLAC, MP3, OGG, M4A/AAC, ALAC, CAF in) to WAV, AIFF or FLAC, optionally ' +
        'changing the sample rate and bit depth or normalizing, with SoundCraft\'s converter.',
      inputSchema: {
        input_path: z.string().optional(),
        input_paths: z.array(z.string()).max(1000).optional(),
        input_dir: z.string().optional().describe('Every audio file directly in this folder.'),
        format: z.enum(AUDIO_OUT).default('wav'),
        sample_rate: z.number().int().min(8000).max(192000).optional(),
        bit_depth: z.enum(['16', '24', '32f']).optional(),
        normalize: z.boolean().default(false),
        suffix: z.string().default(''),
        ...outputSchema,
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const files = collectInputs([...(args.input_path ? [args.input_path] : []), ...(args.input_paths ?? [])], args.input_dir, AUDIO_IN);
        if (files.length > 1 && args.output_path) throw new Error('output_path only works with one file; use output_dir.');
        const results: unknown[] = [];
        for (const file of files) {
          try {
            const out = outputFor(file, args.format, args.suffix, args);
            const extra = [
              ...(args.bit_depth ? ['--bit-depth', args.format === 'flac' && args.bit_depth === '32f' ? '24' : args.bit_depth] : []),
              ...(args.sample_rate ? ['--rate', String(args.sample_rate)] : []),
              ...(args.normalize ? ['--normalize'] : []),
            ];
            await runCli(['convert', file, out, ...extra], 3600);
            results.push({ input: file, success: true, output: out, bytes: size(out) });
          } catch (e) {
            results.push({ input: file, success: false, error: e instanceof Error ? e.message : String(e) });
          }
        }
        const failed = results.filter((r: any) => !r.success).length;
        return json({ success: failed === 0, converted: files.length - failed, failed, results }, failed === files.length);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'get_audio_info',
    {
      title: 'Audio file or session info',
      description:
        'Format, channels, sample rate, bit depth and length of audio files, or the tracks, clips, plugins, busses, markers and tempo of a ' +
        '.scraft session. With loudness=true also the peak, true peak and integrated loudness (LUFS); with waveform=true a picture of it.',
      inputSchema: {
        input_path: z.string().optional(),
        input_paths: z.array(z.string()).max(200).optional(),
        input_dir: z.string().optional(),
        loudness: z.boolean().default(false).describe('Measure peak, true peak and LUFS (renders the audio once).'),
        waveform: z.boolean().default(false).describe('Return a waveform picture of the first file.'),
      },
      annotations: READ,
    },
    async (args) => {
      try {
        const files = collectInputs([...(args.input_path ? [args.input_path] : []), ...(args.input_paths ?? [])], args.input_dir, [...AUDIO_IN, SESSION_EXT]);
        const results: unknown[] = [];
        let first: { data: string; mimeType: string } | undefined;
        for (const [i, file] of files.entries()) {
          try {
            const isSession = path.extname(file).toLowerCase() === `.${SESSION_EXT}`;
            const info: Record<string, unknown> = { input: file, success: true, bytes: size(file) };
            if (!isSession) Object.assign(info, await audioInfo(file));
            if (isSession || args.loudness || (args.waveform && i === 0)) {
              await withSession(async (s) => {
                if (isSession) {
                  const opened = await s.json('open_session', { path: toEnginePath(file) });
                  info['session'] = await sessionSummary(s);
                  if (opened?.missing?.length) info['missing_media'] = opened.missing;
                } else {
                  await s.json('new_session', { name: stemOf(file), sample_rate: (info['sample_rate'] as number) ?? 48000 });
                  await s.json('import_audio', { path: toEnginePath(file), at: secs(0) });
                }
                if (args.loudness || (args.waveform && i === 0)) {
                  const tmp = path.join(s.workDir, 'measure.wav');
                  const r = await s.json('bounce_mix', { path: toEnginePath(tmp), format: 'wav', bit_depth: '16' });
                  if (args.loudness) Object.assign(info, { peak_db: round(r?.peak_db), true_peak_db: round(r?.true_peak_db), lufs: round(r?.lufs) });
                  if (args.waveform && i === 0) first = { data: waveformPng(tmp).png.toString('base64'), mimeType: 'image/png' };
                }
              });
            }
            results.push(info);
          } catch (e) {
            results.push({ input: file, success: false, error: e instanceof Error ? e.message : String(e) });
          }
        }
        const failed = results.filter((r: any) => !r.success).length;
        return withPreview({ success: failed === 0, results }, [first], failed === files.length);
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}

/** `soundcraft-cli info` of an audio file. */
export async function audioInfo(file: string): Promise<{ format?: string; channels?: number; sample_rate?: number; sample_format?: string; frames?: number; seconds?: number }> {
  const out = await runCli(['info', file], 600);
  const v = JSON.parse(out);
  return { format: v.format, channels: v.channels, sample_rate: v.sample_rate, sample_format: v.sample_format, frames: v.frames, seconds: round(v.seconds) as number };
}
