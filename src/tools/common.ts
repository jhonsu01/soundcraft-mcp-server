import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { resolveOutputPath, stemOf } from '../paths.js';
import { withFileLinks } from '../links.js';

export type Content = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string };
export type ToolResult = { content: Content[]; isError?: boolean };

export function json(obj: unknown, isError = false): ToolResult {
  const out: ToolResult = { content: [{ type: 'text', text: JSON.stringify(withFileLinks(obj), null, 2) }] };
  if (isError) out.isError = true;
  return out;
}

export function errorResult(e: unknown): ToolResult {
  return json({ success: false, error: e instanceof Error ? e.message : String(e) }, true);
}

export const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
export const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

export const outputSchema = {
  output_dir: z.string().optional().describe('Absolute output folder (default: next to the input; required for new files).'),
  output_path: z.string().optional().describe('Absolute output file for the first format (its extension must match).'),
  overwrite: z.boolean().default(false).describe('Replace existing outputs.'),
};

/** Absolute input files (and the files directly in `dir` with one of `exts`), checked to exist. */
export function collectInputs(paths: string[], dir?: string, exts?: string[]): string[] {
  const out: string[] = [];
  for (const p of paths) {
    if (!path.isAbsolute(p)) throw new Error(`Paths must be absolute: ${p}`);
    if (!existsSync(p) || !statSync(p).isFile()) throw new Error(`File not found: ${p}`);
    out.push(p);
  }
  if (dir) {
    if (!path.isAbsolute(dir)) throw new Error(`input_dir must be an absolute path: ${dir}`);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`Folder not found: ${dir}`);
    for (const name of readdirSync(dir).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
      const full = path.join(dir, name);
      // Office lock files (~$name.xlsx) are never inputs
      if (!name.startsWith('~$') && (!exts || exts.includes(path.extname(name).slice(1).toLowerCase())) && statSync(full).isFile()) out.push(full);
    }
  }
  if (out.length === 0) throw new Error('No input files.');
  return out;
}

export function outputFor(input: string, ext: string, suffix: string, o: { output_path?: string; output_dir?: string; overwrite?: boolean }): string {
  if (o.output_dir) mkdirSync(o.output_dir, { recursive: true });
  const r = resolveOutputPath({ inputPath: input, ext, suffix, outputPath: o.output_path, outputDir: o.output_dir, overwrite: o.overwrite });
  if ('error' in r) throw new Error(r.error);
  mkdirSync(path.dirname(r.path), { recursive: true });
  return r.path;
}

/** Folder new files go to: output_path's folder or output_dir, which must be absolute. */
export function needDir(o: { output_dir?: string; output_path?: string }): string {
  const dir = o.output_path ? path.dirname(o.output_path) : o.output_dir;
  if (!dir || !path.isAbsolute(dir)) throw new Error('New files need an absolute output_dir or output_path.');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** "1-3,5" → [1,2,3,5] (bounded by the count). */
export function parsePages(spec: string | undefined, count: number): number[] {
  if (!spec) return Array.from({ length: count }, (_, i) => i + 1);
  const out = new Set<number>();
  for (const part of spec.split(',').map((x) => x.trim()).filter(Boolean)) {
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!m) throw new Error(`Bad range "${part}" (use e.g. "1-3,5").`);
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let p = Math.min(a, b); p <= Math.max(a, b); p++) if (p >= 1 && p <= count) out.add(p);
  }
  if (!out.size) throw new Error(`Nothing in "${spec}" (there are ${count}).`);
  return [...out].sort((x, y) => x - y);
}

/** A file name given by the user: kept as is (dots included), except a trailing known extension. */
export function nameStem(name: string, exts: string[]): string {
  const m = /\.([^.\/]+)$/.exec(name);
  return m && exts.includes(m[1].toLowerCase()) ? name.slice(0, -m[0].length) : name;
}

/** Target file for format i of a multi-format save: output_path for the first, else <dir>/<stem><suffix>.<ext>. */
export function targetFor(
  i: number,
  ext: string,
  base: { stemSource: string; name?: string; exts: string[]; suffix: string; output_dir?: string; output_path?: string; overwrite?: boolean },
  extra = '',
): string {
  const usePath = i === 0 && base.output_path;
  if (usePath && path.extname(base.output_path!).slice(1).toLowerCase() !== ext) throw new Error(`output_path must end in .${ext}.`);
  if (usePath) return outputFor(base.output_path + '.__src', ext, '', { output_path: base.output_path, overwrite: base.overwrite });
  const dir = base.output_dir ?? path.dirname(base.output_path ?? base.stemSource);
  const stem = base.output_path ? stemOf(base.output_path) : (base.name !== undefined ? nameStem(base.name, base.exts) : stemOf(base.stemSource)) + base.suffix;
  return outputFor(path.join(dir, stem + extra + '.__src'), ext, '', { output_dir: dir, overwrite: base.overwrite });
}

export function size(p: string): number | undefined {
  try {
    return statSync(p).size;
  } catch {
    return undefined;
  }
}

export function withPreview(body: unknown, imgs: ({ data: string; mimeType: string } | undefined)[], isError = false): ToolResult {
  const res = json(body, isError);
  for (const img of imgs) if (img) res.content.push({ type: 'image', ...img });
  return res;
}

export { stemOf };
