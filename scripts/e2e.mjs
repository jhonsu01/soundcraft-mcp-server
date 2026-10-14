// End-to-end test over real MCP stdio against dist/bundle.cjs (what the .mcpb runs).
// Needs SoundCraft installed. Usage: npm run build && npm run test:e2e
// E2E_BUNDLE=<path to bundle.cjs> tests another build (e.g. the contents of an unpacked .mcpb).
// E2E_LIVE=1 also opens the SoundCraft app with its control channel and drives it (then leaves it open).
// Writes its own synthetic audio into a temp folder whose name has spaces and accents (no personal files).
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';

const out = mkdtempSync(join(tmpdir(), 'sc-e2e-'));
const src = join(out, 'Audio ñandú (prueba)');
mkdirSync(src, { recursive: true });

/** A 16-bit mono WAV: a tone with a fade so the waveform is visibly shaped. */
function wav(path, seconds, freq, rate = 48000) {
  const frames = Math.round(seconds * rate);
  const b = Buffer.alloc(44 + frames * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + frames * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) b.writeInt16LE(Math.round(12000 * Math.sin((2 * Math.PI * freq * i) / rate) * (1 - i / frames)), 44 + i * 2);
  writeFileSync(path, b);
}
const voice = join(src, 'voz.wav');
const music = join(src, 'música.wav');
wav(voice, 3, 220);
wav(music, 4, 440);

const bundle = process.env.E2E_BUNDLE || fileURLToPath(new URL('../dist/bundle.cjs', import.meta.url));
const client = new Client({ name: 'soundcraft-e2e', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [bundle], stderr: 'inherit' }));

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '  OK ' : '  FAIL'} ${label}`);
  if (!ok) failures++;
};
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  const text = r.content.find((c) => c.type === 'text')?.text ?? '{}';
  const body = JSON.parse(text);
  body.__images = r.content.filter((c) => c.type === 'image').length;
  if (r.isError) console.log(`     ! ${name}: ${body.error ?? body.results?.find((x) => !x.success)?.error ?? text.slice(0, 300)}`);
  return body;
};
console.log(`bundle: ${bundle}\nout: ${out}`);

const { tools } = await client.listTools();
console.log(`tools (${tools.length}): ${tools.map((t) => t.name).sort().join(', ')}`);
check(tools.length === 10, `${tools.length} tools`);
check(!JSON.stringify(tools.map((t) => t.inputSchema)).includes('"items":['), 'no JSON Schema tuples (Z.ai/GLM error 1210)');

const st = await call('get_soundcraft_status', {});
check(st.ready && /0\.\d/.test(st.version) && st.commands > 300 && st.plugins > 20, `status: ${st.version} · ${st.commands} commands · ${st.plugins} plugins`);
const plugins = await call('list_soundcraft_catalog', { kind: 'plugins', filter: 'compressor' });
check(plugins.plugins?.[0]?.params?.some((p) => p.id === 'threshold'), 'catalog plugins with parameters');
const cmds = await call('list_soundcraft_catalog', { kind: 'commands', filter: 'bounce' });
check(cmds.count >= 2, `catalog commands "bounce": ${cmds.count}`);

// ---------------------------------------------------------------- create_session
const song = await call('create_session', {
  name: 'Canción de prueba',
  tempo: 100,
  key: 'A minor',
  busses: [{ name: 'Verb', effects: [{ plugin: 'room_reverb' }] }],
  markers: [{ name: 'Intro', at: 0 }, { name: 'Coro', at: 2.4 }],
  tracks: [
    { type: 'instrument', name: 'Batería', instrument: 'drum_synth', bars: 1, repeat: 2, notes: [{ pitch: 'kick', start: 0, length: 0.5 }, { pitch: 'snare', start: 1 }, { pitch: 'kick', start: 2 }, { pitch: 'snare', start: 3 }] },
    { type: 'instrument', name: 'Bajo', notes: [{ pitch: 'A2', start: 0, length: 2 }, { pitch: 'E2', start: 2, length: 2 }], volume_db: -3, pan: -0.3, sends: [{ bus: 'Verb', level_db: -10 }] },
    { type: 'audio', name: 'Voz', files: [{ path: voice, at: 0.5 }], fade_in: 0.2, fade_out: 0.5, clip_gain_db: -2, effects: [{ plugin: 'compressor', params: { threshold: -20 } }] },
  ],
  formats: ['wav', 'flac', 'mid', 'stems', 'scraft'],
  output_dir: out,
});
const outs = Object.fromEntries((song.outputs ?? []).map((o) => [o.format, o]));
check(song.success && Object.keys(outs).length === 5 && Object.values(outs).every((o) => existsSync(o.path)), `create_session: ${Object.keys(outs).join('+')}`);
check(song.__images === 1, 'waveform picture of the mix');
check(typeof song.mix?.lufs === 'number' && song.mix.peak_db < 0 && song.mix.seconds > 4, `mix analysis: peak ${song.mix?.peak_db} dB, ${song.mix?.lufs} LUFS, ${song.mix?.seconds} s`);
const tr = Object.fromEntries((song.session?.tracks ?? []).map((t) => [t.name, t]));
check(tr['Batería']?.clips?.length === 2 && tr['Batería'].clips[0].notes === 4, 'drum clip with 4 notes, repeated twice');
check(tr['Bajo']?.sends?.[0]?.bus === 'Verb' && tr['Bajo'].volume_db === -3 && tr['Bajo'].pan[0] < -0.9 && tr['Bajo'].pan[1] < 0.8, 'bass: volume, stereo pan, send to the bus');
check(tr['Verb']?.kind === 'aux' && tr['Verb'].inserts?.includes('room_reverb'), 'reverb return: aux track with its effect');
check(tr['Voz']?.inserts?.includes('compressor') && tr['Voz'].clips?.[0]?.start === 0.5 && tr['Voz'].clips[0].gain_db === -2, 'audio track: clip at 0.5 s, clip gain, insert');
check((song.session?.markers ?? []).map((m) => m.name).join() === 'Intro,Coro', 'markers');
check(outs.stems?.files?.length === 3 && outs.stems.files.every((f) => existsSync(f)), `stems: ${outs.stems?.files?.length} files (one per track with clips)`);
check(statSync(outs.mid.path).size > 50, 'MIDI file');
check(song.files_markdown?.includes('file:///') && !/[ ()]\]?\(file:[^)]*[ ]/.test(song.files_markdown), 'files_markdown links');

// ---------------------------------------------------------------- edit / export
const ed = await call('edit_session', {
  input_path: outs.scraft.path,
  tempo: 120,
  change_tracks: [{ track: 'Bajo', name: 'Bass', volume_db: -6, effects: [{ plugin: 'saturator' }] }],
  remove_tracks: ['Voz'],
  add_tracks: [{ type: 'audio', files: [{ path: music, at: 0 }] }],
  formats: ['scraft', 'wav'],
  preview: false,
});
const et = Object.fromEntries((ed.session?.tracks ?? []).map((t) => [t.name, t]));
check(ed.success && et['Bass']?.volume_db === -6 && et['Bass'].inserts?.includes('saturator') && !et['Voz'] && Object.keys(et).length === 4, 'edit_session: rename, volume, effect, remove, add');
check(ed.outputs?.every((o) => existsSync(o.path)) && ed.session?.tempo?.[0] === 120, 'edited copy and tempo');
const ex = await call('export_session', { input_dir: out, formats: ['aiff'], normalize: true, output_dir: join(out, 'export') });
check(ex.success && ex.processed === 2 && ex.results.every((r) => Math.abs(r.mix.peak_db + 0.1) < 0.05), `export_session: ${ex.processed} sessions normalized to -0.1 dBFS`);

// ---------------------------------------------------------------- process / convert / info
const pr = await call('process_audio', { input_path: music, normalize_db: -1, pitch_semitones: 2, stretch: 1.5, trim_start: 0.5, fade_in: 0.2, fade_out: 0.5, effects: [{ plugin: 'chorus' }], format: 'flac', bit_depth: '16', output_dir: out });
check(pr.success && pr.results[0].seconds === 5.5 && pr.__images === 1, `process_audio: ${pr.results?.[0]?.seconds} s (4 s × 1.5 − 0.5 s), waveform`);
const cv = await call('convert_audio', { input_dir: src, format: 'aiff', sample_rate: 44100, bit_depth: '16', output_dir: join(out, 'aiff') });
check(cv.success && cv.converted === 2, `convert_audio: ${cv.converted} files`);
const info = await call('get_audio_info', { input_paths: [cv.results[0].output, outs.scraft.path], loudness: true, waveform: true });
check(info.results?.[0]?.sample_rate === 44100 && info.results[0].sample_format === 'Int16' && typeof info.results[0].lufs === 'number', 'info: rate, bit depth, loudness');
check(info.results?.[1]?.session?.tracks?.length === 4 && info.__images === 1, 'info: session tracks and waveform');

// ---------------------------------------------------------------- run commands
const run = await call('run_soundcraft_commands', {
  steps: [
    { id: 'track.new', params: { kind: 'instrument', instrument: 'subtractive_synth', name: 'Lead' } },
    { id: 'midi.new_clip', params: { track: '$steps[0].tracks[0]', length: { seconds: 2 } } },
    { id: 'midi.note_add', params: { clip: '$steps[1].clip', pitch: 64, start_ticks: 0, length_ticks: 1920 } },
  ],
  formats: ['wav'],
  name: 'comandos',
  output_dir: out,
});
check(run.success && run.completed === 3 && existsSync(run.outputs?.[0]?.path) && run.mix?.peak_db > -60, 'run_soundcraft_commands: 3 steps + wav');

// ---------------------------------------------------------------- safety
const again = await call('convert_audio', { input_path: voice, format: 'flac', output_dir: out });
const again2 = await call('convert_audio', { input_path: voice, format: 'flac', output_dir: out });
check(again2.results?.[0]?.output?.endsWith('voz_2.flac') && existsSync(again.results[0].output), 'existing output kept (writes _2)');
const rel = await call('process_audio', { input_path: 'relativo.wav' });
check(rel.success === false && /absolute/.test(rel.error), 'relative paths rejected');
check(statSync(voice).size === 44 + 3 * 48000 * 2 && readdirSync(src).length === 2, 'inputs left untouched');

if (process.env.E2E_LIVE) {
  const op = await call('open_in_soundcraft', { path: outs.scraft.path, control: true });
  check(op.success && op.listening, 'open_in_soundcraft with control channel');
  const live = await call('run_soundcraft_commands', { live: true, steps: [{ id: 'inspect_session', params: { detail: 'summary' } }] });
  check(live.success && live.results[0].result?.tracks?.length > 0, 'live: inspect the open session');
}

await client.close();
console.log(failures ? `\n${failures} FAILED (${out})` : `\nALL OK (${out})`);
process.exit(failures ? 1 : 0);
