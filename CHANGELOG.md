# Changelog

## [1.0.0] - 2026-10-14
### Added
- First release: 10 tools over SoundCraft's headless engine (`soundcraft-cli mcp`) for Windows, macOS and Linux:
  `create_session`, `edit_session`, `export_session`, `process_audio`, `convert_audio`, `get_audio_info`,
  `list_soundcraft_catalog`, `run_soundcraft_commands`, `open_in_soundcraft` and `get_soundcraft_status`.
- Multitrack sessions from audio files (clip gain, fades), instrument tracks played by the subtractive synth, the General
  MIDI drum synth or a sampler from notes in beats (note names and drum names, loops), MIDI files, volume, stereo pan,
  mute, solo, insert effects, aux busses (bus + return track with its effects) and sends, tempo, meter, key, markers.
- Mixdowns to WAV, AIFF and FLAC with peak, true peak and integrated LUFS, stems, MIDI and .scraft sessions; every
  mix comes with a waveform picture drawn by the connector.
- Audio processing (trim, normalize, gain, reverse, invert, pitch shift, time stretch, varispeed, effects, fades) and
  conversion of WAV, AIFF, FLAC, MP3, OGG, M4A/AAC, ALAC and CAF to WAV, AIFF or FLAC.
- Packages: `soundcraft-mcp-server.mcpb` (Claude Desktop, Sunsam Code) and `soundcraft-mcp-server-<version>-codex.zip`
  (Codex and DeepSeek Harness, also published in the Craft Bridges marketplace).
### Verified
- SoundCraft 0.6.1 on Windows 11 (27 end-to-end checks plus 2 driving the live app) and on Debian 12 in Docker, headless
  (27/27); the `.mcpb` tested unpacked. macOS is supported by the path logic but not yet tested on a Mac.
