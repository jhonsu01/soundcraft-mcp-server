import { readFileSync } from 'fs';
import { deflateSync } from 'zlib';

/** Decoded PCM, downmixed to mono, as -1..1 floats. */
export interface Pcm {
  sampleRate: number;
  channels: number;
  frames: number;
  mono: Float32Array;
}

/** Read a RIFF WAV (PCM 8/16/24/32-bit integer or 32/64-bit float, WAVE_FORMAT_EXTENSIBLE too). */
export function readWav(file: string): Pcm {
  const b = readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`Not a WAV file: ${file}`);
  let off = 12;
  let fmt: { tag: number; ch: number; rate: number; bits: number } | undefined;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4);
    const len = b.readUInt32LE(off + 4);
    const body = off + 8;
    if (id === 'fmt ') {
      let tag = b.readUInt16LE(body);
      // WAVE_FORMAT_EXTENSIBLE: the real format is the first two bytes of the sub-format GUID
      if (tag === 0xfffe && len >= 26) tag = b.readUInt16LE(body + 24);
      fmt = { tag, ch: b.readUInt16LE(body + 2), rate: b.readUInt32LE(body + 4), bits: b.readUInt16LE(body + 14) };
    } else if (id === 'data' && fmt) {
      const bytes = fmt.bits / 8;
      const end = Math.min(b.length, body + len);
      const frames = Math.floor((end - body) / (bytes * fmt.ch));
      const mono = new Float32Array(frames);
      const read = (p: number): number => {
        if (fmt!.tag === 3) return bytes === 8 ? b.readDoubleLE(p) : b.readFloatLE(p);
        if (bytes === 1) return (b.readUInt8(p) - 128) / 128;
        if (bytes === 2) return b.readInt16LE(p) / 32768;
        if (bytes === 3) return b.readIntLE(p, 3) / 8388608;
        return b.readInt32LE(p) / 2147483648;
      };
      for (let i = 0; i < frames; i++) {
        let sum = 0;
        for (let c = 0; c < fmt.ch; c++) sum += read(body + (i * fmt.ch + c) * bytes);
        mono[i] = sum / fmt.ch;
      }
      return { sampleRate: fmt.rate, channels: fmt.ch, frames, mono };
    }
    off = body + len + (len % 2);
  }
  throw new Error(`No audio data in ${file}`);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    let c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** RGB PNG from a pixel function. */
export function png(w: number, h: number, pixel: (x: number, y: number) => [number, number, number]): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, bl] = pixel(x, y);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = bl;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/**
 * A waveform picture of a WAV file: min/max per column, a centre line and a mark every second
 * (every 10 s past 30 s), so the length and the loud and quiet parts can be read at a glance.
 */
export function waveformPng(file: string, width = 1000, height = 200): { png: Buffer; seconds: number; peak: number } {
  const pcm = readWav(file);
  const seconds = pcm.frames / pcm.sampleRate;
  const lo = new Float32Array(width).fill(0);
  const hi = new Float32Array(width).fill(0);
  let peak = 0;
  for (let i = 0; i < pcm.frames; i++) {
    const v = pcm.mono[i];
    const x = Math.min(width - 1, Math.floor((i / Math.max(1, pcm.frames)) * width));
    if (v < lo[x]) lo[x] = v;
    if (v > hi[x]) hi[x] = v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  const mid = height / 2;
  const step = seconds > 30 ? 10 : 1;
  const ticks = new Set<number>();
  for (let t = step; t < seconds; t += step) ticks.add(Math.round((t / seconds) * (width - 1)));
  const out = png(width, height, (x, y) => {
    const top = Math.round(mid - hi[x] * (mid - 2));
    const bottom = Math.round(mid - lo[x] * (mid - 2));
    if (y >= top && y <= bottom) return [27, 166, 201];
    if (y === Math.round(mid)) return [180, 190, 200];
    if (ticks.has(x) && (y < 8 || y > height - 9)) return [120, 130, 140];
    return [250, 250, 252];
  });
  return { png: out, seconds, peak };
}
