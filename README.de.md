<p align="center"><img src="icon.png" width="120" alt="SoundCraft-Bridge-Symbol"></p>

<h1 align="center">SoundCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <b>Deutsch</b> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Lass Claude Musik und Audio mit dem auf deinem Computer installierten <b>SoundCraft</b> machen — <b>Windows, macOS und Linux</b>:<br>
  Mehrspur-Songs aus Audiodateien und Synth- oder Drum-Noten, Effekte und Busse, Mixdowns mit Lautheitsmessung, Stems, MIDI, Audiobearbeitung und Konvertierung.
</p>

---

## Warum

[SoundCraft](https://github.com/storytold/soundcraft) ist eine quelloffene Digital Audio Workstation der Pro-Tools-Klasse mit einer CLI ohne Oberfläche (`soundcraft-cli`), 469 Befehlen, 27 eingebauten Plugins (EQ, Dynamik, Halls, Delays, Modulation, Synths, Drum-Synth, Sampler) und einem MCP-Modus. Dieser [Model Context Protocol](https://modelcontextprotocol.io)-Server macht aus dieser Engine **Datei-rein / Datei-raus-Werkzeuge** für Claude, sodass du zum Beispiel fragen kannst:

> *„Mach einen 8-taktigen Drum-and-Bass-Loop mit 110 BPM in a-Moll und exportiere WAV, Stems und MIDI."*
> *„Leg diese Stimme über diese Musik für ein Podcast-Intro: Musik unter der Stimme, Blenden, Kompressor auf der Stimme, -16 LUFS."*
> *„Normalisiere alle Aufnahmen in `D:\Interviews` auf -1 dBFS, schneide die ersten 2 Sekunden ab und speichere 16-Bit-FLAC."*
> *„Transponiere dieses Sample um 3 Halbtöne nach oben und mach es 50 % länger, ohne die Tonhöhe zu ändern."*
> *„Wie laut ist dieses Master (LUFS, True Peak)? Zeig mir die Wellenform."*

Geschwister von [designcraft-mcp-server](https://github.com/jhonsu01/designcraft-mcp-server), [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server), [wordcraft-mcp-server](https://github.com/jhonsu01/wordcraft-mcp-server), [deckcraft-mcp-server](https://github.com/jhonsu01/deckcraft-mcp-server), [gridcraft-mcp-server](https://github.com/jhonsu01/gridcraft-mcp-server) und [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plattformen

| Betriebssystem | Zu installierendes SoundCraft-Paket | Wo der Server es findet (ohne Einrichtung) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI oder portables Zip | `C:\Program Files\SoundCraft`, `%LOCALAPPDATA%\Programs\SoundCraft`, `PATH` | ✅ Geprüft (Windows 11) |
| **Linux** (x86_64, aarch64, riscv64) | `.deb`, `.rpm` oder `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/soundcraft/bin`, `~/.local/bin`, `PATH` | ✅ Geprüft (Debian 12, ohne Oberfläche) |
| **macOS** 11+ (Apple Silicon und Intel) | `.dmg` (die App) **plus** `soundcraft-cli-<version>-macos-universal.zip` | `/Applications/SoundCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Unterstützt, noch nicht auf einem Mac getestet |

Alle Downloads: [SoundCraft-Releases](https://github.com/storytold/soundcraft/releases) (es gibt auch ein FreeBSD-tar.gz; setzen Sie `SOUNDCRAFT_DIR` darauf). An jedem anderen Ort: `SOUNDCRAFT_DIR` (Ordner, `.tar.gz`-Wurzel oder `SoundCraft.app`) oder `SOUNDCRAFT_CLI` setzen.

- **macOS:** Das DMG enthält nur die App. Entpacken Sie das separate `soundcraft-cli`-Zip und verschieben Sie `soundcraft-cli` nach `/usr/local/bin` (oder setzen Sie `SOUNDCRAFT_CLI` darauf). Beim ersten Start wird Apples Notarisierung online geprüft.
- **Linux:** AppImage und Flatpak enthalten nur die App, nicht `soundcraft-cli`; verwenden Sie deb, rpm oder tar.gz. Für eine AppImage-App setzen Sie `SOUNDCRAFT_APP`, damit `open_in_soundcraft` sie starten kann. Auf einem Server ohne GPU nutzte die geprüfte Einrichtung `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Funktionsweise

| Teil | Was es ist |
| --- | --- |
| **SoundCraft-Engine** (`soundcraft-cli mcp`) | SoundCrafts eigene Engine: Spuren, Clips, MIDI, die eingebauten Plugins, Mixer, Busse, Automation, AudioSuite-Bearbeitung und die Writer für WAV / AIFF / FLAC / MIDI / .scraft. Für jeden Auftrag frisch und **ohne Oberfläche** gestartet, sodass sie nie die SoundCraft-App oder ihre Audiogeräte berührt. |
| **MCP-Server** (Node.js) | 10 übergeordnete Werkzeuge. Baut Sessions aus einer einfachen Beschreibung (Spuren, Clips in Sekunden, Noten in Schlägen, Effekte, Sends), prüft jede Ausgabe vorab, misst den Mix (Spitze, True Peak, integrierte LUFS) und zeichnet ein **Wellenformbild** des Ergebnisses, damit der Assistent es sieht. |
| **Live-App** (optional) | `open_in_soundcraft control=true` startet die App mit ihrem nur lokalen Steuerkanal (Port 7801) und `run_soundcraft_commands live=true` steuert sie. Schließe die App, wenn du fertig bist. |

## Werkzeuge

| Werkzeug | Was es tut |
| --- | --- |
| `create_session` | Eine Mehrspur-Session: Audiospuren aus Dateien an beliebigen Zeiten (Clip-Gain, Blenden), Instrumentspuren, gespielt vom subtraktiven Synth, dem General-MIDI-Drum-Synth oder einem Sampler aus Noten in Schlägen (mit Loops), MIDI-Dateien, Lautstärke, Panorama, Mute, Solo, Insert-Effekte, Sends zu Aux-Bussen, Tempo, Taktart, Tonart, Marker. Schreibt den Mixdown, die Stems, das MIDI und die .scraft-Session, mit Spitze, LUFS und Wellenform |
| `edit_session` | Eine geänderte .scraft-Session: Tempo, Taktart, Tonart, Marker, Busse, neue Spuren, vorhandene Spuren umbenannt, neu gemischt, mit neuen Effekten und Sends oder gelöscht; als neue Kopie und Mixdown gespeichert |
| `export_session` | Eine Session, eine Liste oder ein Ordner → WAV- / AIFF- / FLAC-Mixdown (Bereich, Normalisierung, Bittiefe), Stems, MIDI, mit Lautheit |
| `process_audio` | Audiodateien (eine, eine Liste oder ein Ordner): trimmen, normalisieren, Gain, rückwärts, Polarität umkehren, Tonhöhe, Time-Stretch, Varispeed, Effekte, Blenden, Lautstärke und Panorama → WAV, AIFF oder FLAC |
| `convert_audio` | Audiodateien → WAV, AIFF oder FLAC, Abtastrate, Bittiefe, Normalisierung |
| `get_audio_info` | Format, Kanäle, Rate, Bittiefe und Länge von Audiodateien oder die Spuren einer Session; optional Lautheit (Spitze, True Peak, LUFS) und Wellenform |
| `list_soundcraft_catalog` | 469 Befehle, die 27 Plugins mit jedem Parameter (ID, Bereich, Einheit), Drum-Notennamen, Formate |
| `run_soundcraft_commands` | Beliebige Engine-Befehle plus `import_audio`, `inspect_session`, `bounce_mix`... in einer Session (Verweise `$steps[N].feld`), ohne Oberfläche oder live, danach Ausgaben schreiben |
| `open_in_soundcraft` | Öffnet eine Session (oder den Demo-Song) in der SoundCraft-App, optional mit dem Steuerkanal |
| `get_soundcraft_status` | Plattform, Installation, Version, Befehle, Plugins, Pro-Tools-Abdeckung, App / Steuerport |

| | |
| --- | --- |
| **Liest** | WAV, AIFF, FLAC, MP3, OGG, M4A/AAC, ALAC, CAF, Standard-MIDI-Dateien, .scraft-Sessions |
| **Schreibt** | WAV, AIFF, FLAC (16 / 24 Bit, 32 Bit Float), Stems, MIDI, .scraft-Sessions (Audio wird nach „Audio Files" kopiert) |

Zeiten sind **Sekunden**; Noten sind in **Schlägen** (Viertelnoten) ab dem Clip-Anfang. Tonhöhen sind MIDI-Nummern, Namen wie `C4` / `F#3` / `Bb2` oder für `drum_synth` `kick`, `snare`, `clap`, `hat`, `open_hat`, `low_tom`, `mid_tom`, `high_tom`, `crash`, `ride`.

## Beispiel

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

## Voraussetzungen

- **SoundCraft** mit `soundcraft-cli` (getestet mit **0.6.1**); siehe [Plattformen](#plattformen)
- Node.js ≥ 20 (bei `.mcpb`-Installationen in Claude Desktop enthalten)

## Installation

### Claude Desktop (empfohlen, alle Plattformen)

1. Laden Sie `soundcraft-mcp-server.mcpb` aus dem [neuesten Release](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest) herunter.
2. Doppelklicken Sie darauf (oder ziehen Sie sie in Claude Desktop → *Einstellungen → Erweiterungen*) und klicken Sie auf **Installieren**.
3. Optional: Liegt SoundCraft nicht an einem Standardort, geben Sie in den Einstellungen der Erweiterung den Ordner oder den Pfad zu `soundcraft-cli` an.

### Sunsam Code

Installiere **SoundCraft Bridge** aus dem Marketplace von [Sunsam Code](https://github.com/jhonsu01/marketplace-SunsamCode) oder zieh die `.mcpb` in *MCP → Erweiterung installieren*.

### Codex (OpenAI)

**Empfohlen — der Marketplace (erhält Updates):** *Plugins → Hinzufügen → Marketplace hinzufügen*, Quelle `jhonsu01/craft-marketplace`, Referenz `main`, dann **SoundCraft Bridge** aus **Craft Bridges** installieren ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). Neue Versionen kommen durch Aktualisieren des Marketplace. Oder das Zip hochladen (Codex speichert es in Ihrem Konto und lehnt ein neueres Zip mit demselben Namen ab):

1. Laden Sie `soundcraft-mcp-server-<version>-codex.zip` aus dem [neuesten Release](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest) herunter.
2. In Codex: *Plugins → Hinzufügen → Neues Plugin*, das Zip wählen und auf **Plugin hinzufügen** klicken.
3. Codex startet den Server mit `node`, daher muss Node.js ≥ 20 im `PATH` liegen. Liegt SoundCraft nicht an einem Standardort, setzen Sie `SOUNDCRAFT_DIR` oder `SOUNDCRAFT_CLI` als Systemumgebungsvariablen (Codex hat für lokale Plugins kein Einstellungsformular).

### DeepSeek Harness

1. *Plugins → Add plugin*, `github:jhonsu01/craft-marketplace#path:/plugins/soundcraft-mcp-server` eingeben, auf **Install** und dann auf **Enable now** klicken.
2. Harness startet den Server mit seinem eigenen MCP-Client und `node` (Node.js ≥ 20 im `PATH`); die Werkzeuge erscheinen als `mcp__soundcraft__<werkzeug>`, die Ausgabedateien als Karten, die sich in Harness öffnen.
3. Harness aktualisiert Plugins noch nicht selbst: Zum Aktualisieren das Plugin deinstallieren und mit derselben Adresse neu installieren.

### Claude Code / andere MCP-Clients

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

## Konfiguration

| Variable | Bedeutung |
| --- | --- |
| `SOUNDCRAFT_DIR` | SoundCraft-Ordner, eine seiner ausführbaren Dateien, eine `.tar.gz`-Wurzel (mit `bin/`) oder `SoundCraft.app`. Standard: automatische Erkennung |
| `SOUNDCRAFT_CLI` | Pfad zu `soundcraft-cli` / `soundcraft-cli.exe` (hat Vorrang vor `SOUNDCRAFT_DIR`) |
| `SOUNDCRAFT_APP` | Pfad der Desktop-App, wenn sie woanders liegt (z. B. ein Linux-AppImage) |
| `SOUNDCRAFT_CONTROL_PORT` | Steuerport der Desktop-App (Standard 7801) |
| `SOUNDCRAFT_MCP_TIMEOUT` | Maximale Sekunden pro Engine-Aufruf (Standard 3600) |

## Sicherheit

- Dateien werden **nie überschrieben**, außer mit `overwrite: true`: in Ordnern wird ein freier Name (`_2`) verwendet und ein vorhandener `output_path` ist ein Fehler. Eingaben werden nur gelesen; eine bearbeitete Datei wird nur als neue Kopie gespeichert (`_edited`).
- Alle Pfade müssen absolut sein. Die Engine läuft ohne Oberfläche und berührt die SoundCraft-App nie, außer mit `live: true`.
- Alles läuft lokal ohne Netzwerkzugriff. Jeder Auftrag nutzt eine eigene Engine in einem temporären Ordner, der am Ende gelöscht wird.

## Entwicklung

```bash
npm run build       # TypeScript + Ein-Datei-Bundle (dist/bundle.cjs)
npm test            # Unit-Tests (Pfadlogik für Windows, macOS und Linux)
npm run test:e2e    # 27 End-to-End-Prüfungen (29 mit `E2E_LIVE=1`) über echtes MCP-stdio (synthetisches Audio)
npm run pack:mcpb   # soundcraft-mcp-server.mcpb
npm run pack:codex  # Plugin-Zip für Codex / DeepSeek Harness
```

Linux-Test in Docker (zuerst `soundcraft-<version>-linux-x86_64.tar.gz` entpacken):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/pfad/zu/soundcraft-0.6.1-linux-x86_64:/opt/soundcraft:ro" -e SOUNDCRAFT_DIR=/opt/soundcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Lizenz

Apache-2.0. SoundCraft ist © seiner Autoren (Storytold), MIT oder Apache-2.0.
Dieses Projekt ist weder mit SoundCraft noch mit Storytold verbunden oder von ihnen unterstützt. Pro Tools ist eine Marke von Avid.
