import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAdvancedTools } from './tools/advanced.js';
import { registerSessionTools } from './tools/sessions.js';
import { LINK_INSTRUCTIONS } from './links.js';

/** serverInfo.version comes from package.json (reachable as ../package.json from dist/ and src/). */
export function readPackageVersion(): string {
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(path.resolve(dir, '../package.json'), 'utf-8')) as { version?: unknown };
    if (typeof pkg.version === 'string' && pkg.version) return pkg.version;
  } catch {
    // package.json not shipped next to the bundle: still start
  }
  return '0.0.0-unknown';
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'soundcraft-mcp-server', version: readPackageVersion() },
    {
      instructions:
        'Makes music and audio with the engine of the locally installed SoundCraft (Windows, macOS, Linux), an open-source Pro Tools-class ' +
        'digital audio workstation: multitrack sessions from audio files and from notes played by built-in instruments (subtractive synth, ' +
        'General MIDI drum synth, sampler), MIDI files, volume, pan, insert effects (EQ, dynamics, reverb, delay, modulation, saturation), ' +
        'aux busses, tempo, meter, key and markers; mixdowns to WAV, AIFF or FLAC with peak and LUFS, stems, MIDI and editable .scraft ' +
        'sessions; processing of audio files (normalize, gain, reverse, pitch shift, time stretch, effects, fades, trims) and conversion. ' +
        'Notes are in beats (quarter notes); times are seconds. Results include a waveform picture of the mix to check it. All paths must ' +
        'be absolute; inputs are only read; files are never overwritten unless overwrite is true. The engine runs headless and never ' +
        'touches the SoundCraft app unless live=true. list_soundcraft_catalog lists the commands and the plugins with their parameters; ' +
        'run_soundcraft_commands runs any engine command.' +
        ' ' +
        LINK_INSTRUCTIONS,
    },
  );
  registerSessionTools(server);
  registerAdvancedTools(server);
  return server;
}
