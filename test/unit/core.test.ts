import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { cleanEnv, connectorDir, resolveInstall, resolveInt } from '../../src/config.js';
import { resolveOutputPath, sameFile } from '../../src/paths.js';
import { substitute } from '../../src/tools/advanced.js';
import { collectInputs, nameStem, parsePages } from '../../src/tools/common.js';
import { DRUMS, pitchOf, trackSchema } from '../../src/tools/sessions.js';
import { readWav, waveformPng } from '../../src/waveform.js';

const noTuples = (schema: z.ZodType) => {
  const s = JSON.stringify(z.toJSONSchema(schema));
  expect(s).not.toContain('prefixItems');
  expect(s).not.toMatch(/"items":\[/);
};

describe('config', () => {
  it('treats unfilled MCPB placeholders as unset', () => {
    expect(cleanEnv('${user_config.soundcraft_dir}')).toBeUndefined();
    expect(resolveInt('${user_config.control_port}', 7801, 65535)).toBe(7801);
  });
  it('Windows: install folder, an .exe inside it, or nothing', () => {
    const exists = (p: string) => /^D:\\X\\soundcraft(-cli)?\.exe$/i.test(p);
    const r = resolveInstall({ SOUNDCRAFT_DIR: 'D:\\X' }, exists, 'win32', 'C:\\Users\\u');
    expect([r.cli, r.app]).toEqual(['D:\\X\\soundcraft-cli.exe', 'D:\\X\\soundcraft.exe']);
    const pf = (p: string) => p === 'C:\\Program Files\\SoundCraft\\soundcraft-cli.exe';
    expect(resolveInstall({ ProgramFiles: 'C:\\Program Files' }, pf, 'win32').cli).toBe('C:\\Program Files\\SoundCraft\\soundcraft-cli.exe');
  });
  it('Linux: deb/rpm, tar.gz root, AppImage app', () => {
    const deb = new Set(['/usr/bin/soundcraft-cli', '/usr/bin/soundcraft']);
    const r = resolveInstall({}, (p) => deb.has(p), 'linux', '/home/u');
    expect([r.cli, r.app]).toEqual(['/usr/bin/soundcraft-cli', '/usr/bin/soundcraft']);
    const tar = new Set(['/opt/x/soundcraft-0.6.1-linux-x86_64/bin/soundcraft-cli']);
    expect(resolveInstall({ SOUNDCRAFT_DIR: '/opt/x/soundcraft-0.6.1-linux-x86_64' }, (p) => tar.has(p), 'linux', '/home/u').cli).toBe('/opt/x/soundcraft-0.6.1-linux-x86_64/bin/soundcraft-cli');
    const img = '/home/u/soundcraft-0.6.1-linux-x86_64.AppImage';
    expect(resolveInstall({ SOUNDCRAFT_APP: img }, (p) => p === img, 'linux', '/home/u').app).toBe(img);
  });
  it('macOS: SoundCraft.app plus the separate CLI zip', () => {
    const files = new Set(['/Applications/SoundCraft.app/Contents/MacOS/SoundCraft', '/usr/local/bin/soundcraft-cli']);
    const r = resolveInstall({}, (p) => files.has(p), 'darwin', '/Users/u');
    expect([r.cli, r.app]).toEqual(['/usr/local/bin/soundcraft-cli', '/Applications/SoundCraft.app/Contents/MacOS/SoundCraft']);
    expect(connectorDir({}, 'darwin', '/Users/u')).toBe('/Users/u/Library/Application Support/soundcraft-mcp-server');
  });
});

describe('paths and inputs', () => {
  it('never overwrites, POSIX case-sensitive', () => {
    const exists = (p: string) => p === 'D:\\d\\a.pdf';
    expect(resolveOutputPath({ inputPath: 'D:\\d\\a.xyz', ext: 'pdf', exists, platform: 'win32' })).toEqual({ path: 'D:\\d\\a_2.pdf' });
    expect(resolveOutputPath({ inputPath: '/d/a.xyz', ext: 'pdf', outputPath: '/d/out.png', platform: 'linux' })).toHaveProperty('error');
    expect(sameFile('/a/A.x', '/a/a.x', 'linux')).toBe(false);
  });
  it('keeps dots in output names, dropping only a known extension', () => {
    expect(nameStem('mix-1.0.1', ['wav'])).toBe('mix-1.0.1');
    expect(nameStem('song.WAV', ['wav'])).toBe('song');
  });
  it('parses ranges', () => {
    expect(parsePages('1-3, 5, 9', 6)).toEqual([1, 2, 3, 5]);
    expect(() => parsePages('x', 3)).toThrow(/range/i);
  });
  it('collects inputs from a folder, skipping Office lock files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'unit-'));
    for (const f of ['b.WAV', 'a.wav', '~$a.wav', 'c.zzz']) writeFileSync(join(dir, f), 'x');
    expect(collectInputs([], dir, ['wav']).map((p) => p.slice(dir.length + 1))).toEqual(['a.wav', 'b.WAV']);
    expect(() => collectInputs(['rel.x'])).toThrow(/absolute/);
  });
});

describe('run_*_commands references', () => {
  it('replaces $steps values', () => {
    expect(substitute({ a: '$steps[0].tracks[0]', b: ['$steps[1].id'], c: '$x' }, [{ tracks: [4] }, { id: 7 }])).toEqual({ a: 4, b: [7], c: '$x' });
    expect(() => substitute('$steps[3].id', [])).toThrow();
  });
});

describe('notes', () => {
  it('reads MIDI numbers, note names and drums', () => {
    expect(pitchOf(60)).toBe(60);
    expect(pitchOf('C4')).toBe(60);
    expect(pitchOf('A4')).toBe(69);
    expect(pitchOf('F#3')).toBe(54);
    expect(pitchOf('Bb2')).toBe(46);
    expect(pitchOf('kick')).toBe(DRUMS.kick);
    expect(pitchOf('snare')).toBe(38);
    expect(() => pitchOf('H9')).toThrow(/Unknown note/);
  });
  it('track schema has no JSON Schema tuples (Z.ai / GLM rejects them with error 1210)', () => {
    noTuples(z.array(trackSchema));
    expect(trackSchema.parse({ type: 'instrument', notes: [{ pitch: 'C4', start: 0 }] })).toMatchObject({ instrument: 'subtractive_synth', repeat: 1, at: 0 });
  });
});

describe('waveform', () => {
  it('reads 16-bit and float WAV and draws a PNG', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wav-'));
    const wav = (bits: 16 | 32, float: boolean) => {
      const frames = 4800;
      const bytes = bits / 8;
      const b = Buffer.alloc(44 + frames * 2 * bytes);
      b.write('RIFF', 0);
      b.writeUInt32LE(36 + frames * 2 * bytes, 4);
      b.write('WAVE', 8);
      b.write('fmt ', 12);
      b.writeUInt32LE(16, 16);
      b.writeUInt16LE(float ? 3 : 1, 20);
      b.writeUInt16LE(2, 22);
      b.writeUInt32LE(48000, 24);
      b.writeUInt32LE(48000 * 2 * bytes, 28);
      b.writeUInt16LE(2 * bytes, 32);
      b.writeUInt16LE(bits, 34);
      b.write('data', 36);
      b.writeUInt32LE(frames * 2 * bytes, 40);
      for (let i = 0; i < frames * 2; i++) {
        const v = 0.5 * Math.sin(i / 20);
        if (float) b.writeFloatLE(v, 44 + i * 4);
        else b.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
      }
      const p = join(dir, `t${bits}${float}.wav`);
      writeFileSync(p, b);
      return p;
    };
    for (const p of [wav(16, false), wav(32, true)]) {
      const pcm = readWav(p);
      expect(pcm.frames).toBe(4800);
      expect(pcm.sampleRate).toBe(48000);
      const w = waveformPng(p, 200, 60);
      expect(w.png.subarray(1, 4).toString()).toBe('PNG');
      expect(w.seconds).toBeCloseTo(0.1, 3);
      expect(w.peak).toBeGreaterThan(0.45);
    }
  });
});
