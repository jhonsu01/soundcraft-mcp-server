<p align="center"><img src="icon.png" width="120" alt="Icône de SoundCraft Bridge"></p>

<h1 align="center">SoundCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <b>Français</b> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Laissez Claude faire de la musique et de l'audio avec le <b>SoundCraft</b> installé sur votre ordinateur — <b>Windows, macOS et Linux</b> :<br>
  morceaux multipistes à partir de fichiers audio et de notes de synthé ou de batterie, effets et bus, mixages avec mesure de loudness, stems, MIDI, traitement et conversion audio.
</p>

---

## Pourquoi

[SoundCraft](https://github.com/storytold/soundcraft) est une station audionumérique open source de la classe de Pro Tools, avec une CLI sans interface (`soundcraft-cli`), 469 commandes, 27 plugins intégrés (EQ, dynamique, réverbes, délais, modulation, synthés, boîte à rythmes, sampler) et un mode MCP. Ce serveur [Model Context Protocol](https://modelcontextprotocol.io) transforme ce moteur en **outils fichier en entrée / fichier en sortie** pour Claude, pour demander par exemple :

> *« Fais une boucle batterie-basse de 8 mesures à 110 BPM en la mineur et exporte WAV, stems et MIDI. »*
> *« Mets cette voix sur cette musique pour l'intro d'un podcast : musique sous la voix, fondus, compresseur sur la voix, -16 LUFS. »*
> *« Normalise tous les enregistrements de `D:\Interviews` à -1 dBFS, coupe les 2 premières secondes et enregistre en FLAC 16 bits. »*
> *« Monte ce sample de 3 demi-tons et rallonge-le de 50 % sans changer la hauteur. »*
> *« Quel est le niveau de ce master (LUFS, true peak) ? Montre-moi sa forme d'onde. »*

Frère de [designcraft-mcp-server](https://github.com/jhonsu01/designcraft-mcp-server), [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server), [wordcraft-mcp-server](https://github.com/jhonsu01/wordcraft-mcp-server), [deckcraft-mcp-server](https://github.com/jhonsu01/deckcraft-mcp-server), [gridcraft-mcp-server](https://github.com/jhonsu01/gridcraft-mcp-server) et [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plateformes

| OS | Paquet SoundCraft à installer | Où le serveur le trouve (sans configuration) | État |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI ou zip portable | `C:\Program Files\SoundCraft`, `%LOCALAPPDATA%\Programs\SoundCraft`, `PATH` | ✅ Vérifié (Windows 11) |
| **Linux** (x86_64, aarch64, riscv64) | `.deb`, `.rpm` ou `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/soundcraft/bin`, `~/.local/bin`, `PATH` | ✅ Vérifié (Debian 12, sans interface) |
| **macOS** 11+ (Apple silicon et Intel) | `.dmg` (l'application) **plus** `soundcraft-cli-<version>-macos-universal.zip` | `/Applications/SoundCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Pris en charge, pas encore testé sur un Mac |

Tous les téléchargements : [versions de SoundCraft](https://github.com/storytold/soundcraft/releases) (il existe aussi un tar.gz pour FreeBSD ; pointez `SOUNDCRAFT_DIR` dessus). Ailleurs : définissez `SOUNDCRAFT_DIR` (dossier, racine du `.tar.gz` ou `SoundCraft.app`) ou `SOUNDCRAFT_CLI`.

- **macOS :** le DMG ne contient que l'application. Décompressez le zip séparé de `soundcraft-cli` et déplacez `soundcraft-cli` vers `/usr/local/bin` (ou pointez `SOUNDCRAFT_CLI` dessus). Le premier lancement vérifie en ligne la notarisation d'Apple.
- **Linux :** l'AppImage et le Flatpak ne contiennent que l'application, pas `soundcraft-cli` ; utilisez le deb, le rpm ou le tar.gz. Pour une application AppImage, définissez `SOUNDCRAFT_APP` pour que `open_in_soundcraft` puisse la lancer. Sur un serveur sans GPU, la configuration vérifiée utilisait `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Fonctionnement

| Élément | Ce que c'est |
| --- | --- |
| **Moteur SoundCraft** (`soundcraft-cli mcp`) | Le moteur de SoundCraft lui-même : pistes, clips, MIDI, plugins intégrés, console, bus, automation, traitement AudioSuite et écrivains WAV / AIFF / FLAC / MIDI / .scraft. Démarré à neuf et **sans interface** pour chaque tâche : il ne touche jamais l'app SoundCraft ni ses périphériques audio. |
| **Serveur MCP** (Node.js) | 10 outils de haut niveau. Construit les sessions à partir d'une description simple (pistes, clips en secondes, notes en temps, effets, envois), vérifie chaque sortie au préalable, mesure le mixage (crête, true peak, LUFS intégré) et dessine une **image de la forme d'onde** du résultat pour que l'assistant la voie. |
| **App en direct** (facultatif) | `open_in_soundcraft control=true` lance l'app avec son canal de contrôle local uniquement (port 7801) et `run_soundcraft_commands live=true` la pilote. Fermez l'app quand vous avez fini. |

## Outils

| Outil | Ce qu'il fait |
| --- | --- |
| `create_session` | Une session multipiste : pistes audio à partir de fichiers placés dans le temps (gain de clip, fondus), pistes d'instrument jouées par le synthé soustractif, la boîte à rythmes General MIDI ou un sampler à partir de notes en temps (avec boucles), fichiers MIDI, volume, panoramique, mute, solo, effets d'insertion, envois vers des bus auxiliaires, tempo, mesure, tonalité, marqueurs. Écrit le mixage, les stems, le MIDI et la session .scraft, avec crête, LUFS et forme d'onde |
| `edit_session` | Une session .scraft modifiée : tempo, mesure, tonalité, marqueurs, bus, nouvelles pistes, pistes existantes renommées, remixées, avec de nouveaux effets et envois, ou supprimées ; enregistrée comme nouvelle copie et mixage |
| `export_session` | Une session, une liste ou un dossier → mixage WAV / AIFF / FLAC (plage, normalisation, résolution), stems, MIDI, avec loudness |
| `process_audio` | Fichiers audio (un, une liste ou un dossier) : rognage, normalisation, gain, inversion du sens ou de la polarité, transposition, étirement temporel, varispeed, effets, fondus, volume et panoramique → WAV, AIFF ou FLAC |
| `convert_audio` | Fichiers audio → WAV, AIFF ou FLAC, fréquence d'échantillonnage, résolution, normalisation |
| `get_audio_info` | Format, canaux, fréquence, résolution et durée de fichiers audio ou les pistes d'une session ; en option la loudness (crête, true peak, LUFS) et la forme d'onde |
| `list_soundcraft_catalog` | 469 commandes, les 27 plugins avec chaque paramètre (id, plage, unité), noms des notes de batterie, formats |
| `run_soundcraft_commands` | N'importe quelles commandes du moteur plus `import_audio`, `inspect_session`, `bounce_mix`... dans une session (références `$steps[N].champ`), sans interface ou en direct, puis écriture des sorties |
| `open_in_soundcraft` | Ouvre une session (ou le morceau de démo) dans l'app SoundCraft, éventuellement avec le canal de contrôle |
| `get_soundcraft_status` | Plateforme, installation, version, commandes, plugins, couverture de Pro Tools, app / port de contrôle |

| | |
| --- | --- |
| **Lit** | WAV, AIFF, FLAC, MP3, OGG, M4A/AAC, ALAC, CAF, fichiers MIDI standard, sessions .scraft |
| **Écrit** | WAV, AIFF, FLAC (16 / 24 bits, 32 bits flottant), stems, MIDI, sessions .scraft (l'audio est copié dans « Audio Files ») |

Les temps sont en **secondes** ; les notes, en **temps** (noires) depuis le début de leur clip. Les hauteurs sont des numéros MIDI, des noms comme `C4` / `F#3` / `Bb2` ou, pour `drum_synth`, `kick`, `snare`, `clap`, `hat`, `open_hat`, `low_tom`, `mid_tom`, `high_tom`, `crash`, `ride`.

## Exemple

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

## Prérequis

- **SoundCraft** avec `soundcraft-cli` (testé avec **0.6.1**) ; voir [Plateformes](#plateformes)
- Node.js ≥ 20 (fourni avec Claude Desktop pour les installations `.mcpb`)

## Installation

### Claude Desktop (recommandé, toutes plateformes)

1. Téléchargez `soundcraft-mcp-server.mcpb` depuis la [dernière version](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest).
2. Double-cliquez dessus (ou glissez-le dans Claude Desktop → *Paramètres → Extensions*) et cliquez sur **Installer**.
3. Facultatif : si SoundCraft n'est pas à un emplacement standard, indiquez son dossier ou le chemin de `soundcraft-cli` dans les paramètres de l'extension.

### Sunsam Code

Installez **SoundCraft Bridge** depuis la marketplace de [Sunsam Code](https://github.com/jhonsu01/marketplace-SunsamCode), ou déposez le `.mcpb` dans *MCP → Installer une extension*.

### Codex (OpenAI)

**Recommandé — le marketplace (reçoit les mises à jour) :** *Plugins → Ajouter → Ajouter un marketplace*, source `jhonsu01/craft-marketplace`, référence `main`, puis installez **SoundCraft Bridge** depuis **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). Les nouvelles versions arrivent en actualisant le marketplace. Ou envoyez le zip (Codex le garde dans votre compte et refuse un zip plus récent portant le même nom) :

1. Téléchargez `soundcraft-mcp-server-<version>-codex.zip` depuis la [dernière version](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest).
2. Dans Codex : *Plugins → Ajouter → Nouveau plugin*, choisissez le zip et cliquez sur **Ajouter le plugin**.
3. Codex lance le serveur avec `node` : Node.js ≥ 20 doit donc être dans le `PATH`. Si SoundCraft n'est pas à un emplacement standard, définissez `SOUNDCRAFT_DIR` ou `SOUNDCRAFT_CLI` comme variables d'environnement système (Codex n'a pas de formulaire de paramètres pour les plugins locaux).

### DeepSeek Harness

1. *Plugins → Add plugin*, saisissez `github:jhonsu01/craft-marketplace#path:/plugins/soundcraft-mcp-server` puis cliquez sur **Install**, puis sur **Enable now**.
2. Harness lance le serveur avec son propre client MCP et `node` (Node.js ≥ 20 dans le `PATH`) ; les outils apparaissent sous la forme `mcp__soundcraft__<outil>` et les fichiers produits comme des cartes qui s'ouvrent dans Harness.
3. Harness ne met pas encore les plugins à jour tout seul : pour mettre à jour, désinstallez le plugin puis réinstallez-le avec la même adresse.

### Claude Code / autres clients MCP

```bash
git clone https://github.com/jhonsu01/soundcraft-mcp-server.git
cd soundcraft-mcp-server
npm install
npm run build
```

Windows :

```bash
claude mcp add soundcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux :

```bash
claude mcp add soundcraft -- node "$PWD/dist/bundle.cjs"
```

## Configuration

| Variable | Signification |
| --- | --- |
| `SOUNDCRAFT_DIR` | Dossier de SoundCraft, l'un de ses exécutables, la racine d'un `.tar.gz` (avec `bin/`) ou `SoundCraft.app`. Par défaut : détection automatique |
| `SOUNDCRAFT_CLI` | Chemin de `soundcraft-cli` / `soundcraft-cli.exe` (prioritaire sur `SOUNDCRAFT_DIR`) |
| `SOUNDCRAFT_APP` | Chemin de l'application de bureau si elle est ailleurs (par ex. une AppImage Linux) |
| `SOUNDCRAFT_CONTROL_PORT` | Port de contrôle de l'application de bureau (7801 par défaut) |
| `SOUNDCRAFT_MCP_TIMEOUT` | Nombre maximal de secondes par appel au moteur (3600 par défaut) |

## Sécurité

- Les fichiers ne sont **jamais écrasés** sans `overwrite: true` : dans un dossier, un nom libre (`_2`) est utilisé et un `output_path` existant est une erreur. Les entrées sont seulement lues ; un fichier modifié est enregistré uniquement comme nouvelle copie (`_edited`).
- Tous les chemins doivent être absolus. Le moteur tourne sans interface et ne touche jamais à l'application SoundCraft sauf avec `live: true`.
- Tout s'exécute en local, sans accès réseau. Chaque tâche utilise un moteur privé dans un dossier temporaire supprimé à la fin.

## Développement

```bash
npm run build       # TypeScript + bundle en un seul fichier (dist/bundle.cjs)
npm test            # tests unitaires (logique des chemins Windows, macOS et Linux)
npm run test:e2e    # 27 vérifications de bout en bout (29 avec `E2E_LIVE=1`) via un vrai MCP stdio (audio synthétique)
npm run pack:mcpb   # soundcraft-mcp-server.mcpb
npm run pack:codex  # zip du plugin Codex / DeepSeek Harness
```

Test Linux dans Docker (décompressez d'abord `soundcraft-<version>-linux-x86_64.tar.gz`) :

```bash
docker run --rm -v "$PWD:/work:ro" -v "/chemin/vers/soundcraft-0.6.1-linux-x86_64:/opt/soundcraft:ro" -e SOUNDCRAFT_DIR=/opt/soundcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licence

Apache-2.0. SoundCraft est © ses auteurs (Storytold), MIT ou Apache-2.0.
Ce projet n'est ni affilié ni approuvé par SoundCraft ou Storytold. Pro Tools est une marque de Avid.
