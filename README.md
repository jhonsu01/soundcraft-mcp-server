<p align="center"><img src="icon.png" width="120" alt="SoundCraft Bridge icon"></p>

<h1 align="center">SoundCraft MCP Server</h1>

<p align="center">
  <b>English</b> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Let Claude make music and audio with the <b>SoundCraft</b> installed on your computer — <b>Windows, macOS and Linux</b>:<br>
  multitrack songs from audio files and synth or drum notes, effects and busses, mixdowns with loudness, stems, MIDI, audio processing and conversion.
</p>

---

## Why

[SoundCraft](https://github.com/storytold/soundcraft) is an open-source, Pro Tools-class digital audio workstation with a headless CLI (`soundcraft-cli`), 469 commands, 27 built-in plugins (EQ, dynamics, reverbs, delays, modulation, synths, drum synth, sampler) and an MCP mode. This [Model Context Protocol](https://modelcontextprotocol.io) server turns that engine into **file-in / file-out tools** for Claude, so you can ask things like:

> *"Make an 8-bar drum and bass loop at 110 BPM in A minor and export WAV, stems and MIDI."*
> *"Put this voice over this music for a podcast intro: music under the voice, fades, compressor on the voice, -16 LUFS."*
> *"Normalize every recording in `D:\Interviews` to -1 dBFS, cut the first 2 seconds and save 16-bit FLAC."*
> *"Pitch this sample up 3 semitones and make it 50 % longer without changing the pitch."*
> *"How loud is this master (LUFS, true peak)? Show me its waveform."*

Sibling of [designcraft-mcp-server](https://github.com/jhonsu01/designcraft-mcp-server), [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server), [wordcraft-mcp-server](https://github.com/jhonsu01/wordcraft-mcp-server), [deckcraft-mcp-server](https://github.com/jhonsu01/deckcraft-mcp-server), [gridcraft-mcp-server](https://github.com/jhonsu01/gridcraft-mcp-server) and [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Platforms

| OS | SoundCraft package to install | Where the server finds it (no setup needed) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI or portable zip | `C:\Program Files\SoundCraft`, `%LOCALAPPDATA%\Programs\SoundCraft`, `PATH` | ✅ Verified (Windows 11) |
| **Linux** (x86_64, aarch64, riscv64) | `.deb`, `.rpm` or `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/soundcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verified (Debian 12, headless) |
| **macOS** 11+ (Apple silicon and Intel) | `.dmg` (the app) **plus** `soundcraft-cli-<version>-macos-universal.zip` | `/Applications/SoundCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Supported, not yet tested on a Mac |

All downloads: [SoundCraft releases](https://github.com/storytold/soundcraft/releases) (there is also a FreeBSD tar.gz; set `SOUNDCRAFT_DIR` to it). Anywhere else: set `SOUNDCRAFT_DIR` (folder, `.tar.gz` root or `SoundCraft.app`) or `SOUNDCRAFT_CLI`.

- **macOS:** the DMG contains only the app. Unzip the separate `soundcraft-cli` zip and move `soundcraft-cli` to `/usr/local/bin` (or point `SOUNDCRAFT_CLI` at it). The first run checks Apple's notarization online.
- **Linux:** the AppImage and Flatpak contain only the app, not `soundcraft-cli`; use the deb, rpm or tar.gz. For an AppImage app, set `SOUNDCRAFT_APP` so `open_in_soundcraft` can start it. On a server without a GPU, the verified setup used `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## How it works

| Part | What it is |
| --- | --- |
| **SoundCraft engine** (`soundcraft-cli mcp`) | SoundCraft's own engine: tracks, clips, MIDI, the built-in plugins, mixer, busses, automation, AudioSuite processing and the WAV / AIFF / FLAC / MIDI / .scraft writers. Started fresh and **headless** for each job, so it never touches the SoundCraft app or its audio devices. |
| **MCP server** (Node.js) | 10 high-level tools. Builds sessions from a simple description (tracks, clips at seconds, notes in beats, effects, sends), checks every output first, measures the mix (peak, true peak, integrated LUFS) and draws a **waveform picture** of the result so the assistant can see it. |
| **Live app** (optional) | `open_in_soundcraft control=true` starts the app with its loopback-only control channel (port 7801) and `run_soundcraft_commands live=true` drives it. Close the app when you are done. |

## Tools

| Tool | What it does |
| --- | --- |
| `create_session` | A multitrack session: audio tracks from files placed at times (clip gain, fades), instrument tracks played by the subtractive synth, the General MIDI drum synth or a sampler from notes in beats (with loops), MIDI files, volume, pan, mute, solo, insert effects, sends to aux busses, tempo, meter, key, markers. Writes the mixdown, stems, MIDI and the .scraft session, with peak, LUFS and a waveform |
| `edit_session` | A .scraft session changed: tempo, meter, key, markers, busses, new tracks, existing tracks renamed, re-mixed, with new effects and sends, or removed; written as a new copy and mixdown |
| `export_session` | One session, a list or a folder → WAV / AIFF / FLAC mixdown (range, normalize, bit depth), stems, MIDI, with loudness |
| `process_audio` | Audio files (one, a list or a folder): trim, normalize, gain, reverse, invert, pitch shift, time stretch, varispeed, effects, fades, volume and pan → WAV, AIFF or FLAC |
| `convert_audio` | Audio files → WAV, AIFF or FLAC, sample rate, bit depth, normalize |
| `get_audio_info` | Format, channels, rate, bit depth and length of audio files or the tracks of a session; optionally loudness (peak, true peak, LUFS) and a waveform |
| `list_soundcraft_catalog` | 469 commands, the 27 plugins with every parameter (id, range, unit), drum note names, formats |
| `run_soundcraft_commands` | Any engine commands plus `import_audio`, `inspect_session`, `bounce_mix`... in one session (`$steps[N].field` references), headless or live, then write outputs |
| `open_in_soundcraft` | Open a session (or the demo song) in the SoundCraft app, optionally with the control channel |
| `get_soundcraft_status` | Platform, installation, version, commands, plugins, Pro Tools coverage, app / control port |

| | |
| --- | --- |
| **Reads** | WAV, AIFF, FLAC, MP3, OGG, M4A/AAC, ALAC, CAF, Standard MIDI Files, .scraft sessions |
| **Writes** | WAV, AIFF, FLAC (16 / 24-bit, 32-bit float), stems, MIDI, .scraft sessions (audio copied into "Audio Files") |

Times are **seconds**; notes are in **beats** (quarter notes) from the start of their clip. Pitches are MIDI numbers, names like `C4` / `F#3` / `Bb2`, or, for `drum_synth`, `kick`, `snare`, `clap`, `hat`, `open_hat`, `low_tom`, `mid_tom`, `high_tom`, `crash`, `ride`.

## Example

```json
{
  "name": "Night drive",
  "tempo": 100,
  "key": "A minor",
  "busses": [{ "name": "Verb", "effects": [{ "plugin": "plate_reverb", "params": { "mix": 30 } }] }],
  "markers": [{ "name": "Intro", "at": 0 }, { "name": "Chorus", "at": 9.6 }],
  "tracks": [
    { "type": "instrument", "name": "Drums", "instrument": "drum_synth", "bars": 1, "repeat": 8,
      "notes": [{ "pitch": "kick", "start": 0 }, { "pitch": "hat", "start": 0.5, "length": 0.5 }, { "pitch": "snare", "start": 1 },
                { "pitch": "hat", "start": 1.5, "length": 0.5 }, { "pitch": "kick", "start": 2 }, { "pitch": "snare", "start": 3 }] },
    { "type": "instrument", "name": "Bass", "volume_db": -4, "pan": -0.2, "sends": [{ "bus": "Verb", "level_db": -14 }],
      "notes": [{ "pitch": "A1", "start": 0, "length": 2 }, { "pitch": "F1", "start": 2, "length": 2 }], "repeat": 4 },
    { "type": "audio", "name": "Voice", "files": [{ "path": "C:\\Audio\\voice.wav", "at": 4.8 }], "fade_in": 0.3, "fade_out": 1,
      "effects": [{ "plugin": "eq_7band", "params": { "hpf_on": 1, "hpf_freq": 90 } }, { "plugin": "compressor", "params": { "threshold": -18, "ratio": 3 } }] }
  ],
  "formats": ["wav", "stems", "mid", "scraft"],
  "normalize": true,
  "output_dir": "C:\\Music"
}
```

## Requirements

- **SoundCraft** with `soundcraft-cli` (tested with **0.6.1**); see [Platforms](#platforms)
- Node.js ≥ 20 (bundled with Claude Desktop for `.mcpb` installs)

## Installation

### Claude Desktop (recommended, all platforms)

1. Download `soundcraft-mcp-server.mcpb` from the [latest release](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest).
2. Double-click it (or drag it into Claude Desktop → *Settings → Extensions*) and click **Install**.
3. Optional: if SoundCraft is not in a standard location, fill in its folder or the `soundcraft-cli` path in the extension settings.

### Sunsam Code

Install **SoundCraft Bridge** from the [Sunsam Code marketplace](https://github.com/jhonsu01/marketplace-SunsamCode), or drop the `.mcpb` into *MCP → Install extension*.

### Codex (OpenAI)

**Recommended — the marketplace (gets updates):** *Plugins → Add → Add marketplace*, source `jhonsu01/craft-marketplace`, reference `main`, then install **SoundCraft Bridge** from **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). New versions arrive by refreshing the marketplace. Or upload the zip (Codex then keeps it in your account and refuses a newer zip with the same name):

1. Download `soundcraft-mcp-server-<version>-codex.zip` from the [latest release](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest).
2. In Codex: *Plugins → Add → New plugin*, choose the zip and click **Add plugin**.
3. Codex starts the server with `node`, so Node.js ≥ 20 must be on `PATH`. If SoundCraft is not in a standard location, set `SOUNDCRAFT_DIR` or `SOUNDCRAFT_CLI` as system environment variables (Codex has no settings form for local plugins).

### DeepSeek Harness

1. *Plugins → Add plugin*, enter `github:jhonsu01/craft-marketplace#path:/plugins/soundcraft-mcp-server` and click **Install**, then **Enable now**.
2. Harness runs the server with its own MCP client and `node` (Node.js ≥ 20 on `PATH`); the tools appear as `mcp__soundcraft__<tool>` and the output files as cards that open in Harness.
3. Harness does not update plugins by itself yet: to upgrade, uninstall the plugin and install it again with the same address.

### Claude Code / other MCP clients

```bash
git clone https://github.com/jhonsu01/soundcraft-mcp-server.git
cd soundcraft-mcp-server
npm install
npm run build
```

Windows:

```bash
claude mcp add soundcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux:

```bash
claude mcp add soundcraft -- node "$PWD/dist/bundle.cjs"
```

## Configuration

| Variable | Meaning |
| --- | --- |
| `SOUNDCRAFT_DIR` | SoundCraft folder, one of its executables, a `.tar.gz` root (with `bin/`) or `SoundCraft.app`. Default: auto-detect |
| `SOUNDCRAFT_CLI` | Path of `soundcraft-cli` / `soundcraft-cli.exe` (wins over `SOUNDCRAFT_DIR`) |
| `SOUNDCRAFT_APP` | Path of the desktop app when it lives elsewhere (e.g. a Linux AppImage) |
| `SOUNDCRAFT_CONTROL_PORT` | Control port of the desktop app (default 7801) |
| `SOUNDCRAFT_MCP_TIMEOUT` | Maximum seconds per engine call (default 3600) |

## Safety

- Files are **never overwritten** unless `overwrite: true`: a free name (`_2`) is used in folders and an existing `output_path` is an error. Inputs are only read; an edited file is saved only as a new copy (`_edited`).
- All paths must be absolute. The engine runs headless and never touches the SoundCraft app unless `live: true`.
- Everything runs locally with no network access. Each job uses a private engine in a temporary folder that is deleted at the end.

## Development

```bash
npm run build       # TypeScript + single-file bundle (dist/bundle.cjs)
npm test            # unit tests (Windows, macOS and Linux path logic)
npm run test:e2e    # 27 end-to-end checks (29 with `E2E_LIVE=1`) over real MCP stdio (synthetic audio)
npm run pack:mcpb   # soundcraft-mcp-server.mcpb
npm run pack:codex  # Codex / DeepSeek Harness plugin zip
```

Linux test in Docker (unpack `soundcraft-<version>-linux-x86_64.tar.gz` first):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/soundcraft-0.6.1-linux-x86_64:/opt/soundcraft:ro" -e SOUNDCRAFT_DIR=/opt/soundcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## License

Apache-2.0. SoundCraft is © its authors (Storytold), MIT or Apache-2.0.
This project is not affiliated with or endorsed by SoundCraft or Storytold. Pro Tools is a trademark of Avid.
