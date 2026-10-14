<p align="center"><img src="icon.png" width="120" alt="Icono de SoundCraft Bridge"></p>

<h1 align="center">SoundCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <b>Español</b> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Deja que Claude haga música y audio con el <b>SoundCraft</b> instalado en tu equipo — <b>Windows, macOS y Linux</b>:<br>
  canciones multipista con archivos de audio y notas de sintetizador o batería, efectos y buses, mezclas con sonoridad, stems, MIDI, procesamiento y conversión de audio.
</p>

---

## Por qué

[SoundCraft](https://github.com/storytold/soundcraft) es una estación de trabajo de audio digital de código abierto al estilo de Pro Tools, con una CLI sin interfaz (`soundcraft-cli`), 469 comandos, 27 plugins integrados (EQ, dinámica, reverberaciones, retardos, modulación, sintetizadores, caja de ritmos, sampler) y un modo MCP. Este servidor [Model Context Protocol](https://modelcontextprotocol.io) convierte ese motor en **herramientas de archivo de entrada / archivo de salida** para Claude, para que puedas pedir cosas como:

> *"Haz un loop de batería y bajo de 8 compases a 110 BPM en La menor y exporta WAV, stems y MIDI."*
> *"Pon esta voz sobre esta música para la intro de un pódcast: música debajo de la voz, fundidos, compresor en la voz, -16 LUFS."*
> *"Normaliza todas las grabaciones de `D:\Entrevistas` a -1 dBFS, quita los 2 primeros segundos y guarda FLAC de 16 bits."*
> *"Sube este sample 3 semitonos y alárgalo un 50 % sin cambiar el tono."*
> *"¿Qué tan fuerte suena este máster (LUFS, true peak)? Muéstrame su forma de onda."*

Hermano de [designcraft-mcp-server](https://github.com/jhonsu01/designcraft-mcp-server), [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server), [wordcraft-mcp-server](https://github.com/jhonsu01/wordcraft-mcp-server), [deckcraft-mcp-server](https://github.com/jhonsu01/deckcraft-mcp-server), [gridcraft-mcp-server](https://github.com/jhonsu01/gridcraft-mcp-server) y [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plataformas

| SO | Paquete de SoundCraft que instalar | Dónde lo encuentra el servidor (sin configurar nada) | Estado |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI o zip portable | `C:\Program Files\SoundCraft`, `%LOCALAPPDATA%\Programs\SoundCraft`, `PATH` | ✅ Verificado (Windows 11) |
| **Linux** (x86_64, aarch64, riscv64) | `.deb`, `.rpm` o `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/soundcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verificado (Debian 12, sin interfaz) |
| **macOS** 11+ (Apple silicon e Intel) | `.dmg` (la app) **más** `soundcraft-cli-<versión>-macos-universal.zip` | `/Applications/SoundCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Soportado, aún sin probar en un Mac |

Todas las descargas: [versiones de SoundCraft](https://github.com/storytold/soundcraft/releases) (también hay un tar.gz para FreeBSD; apunta `SOUNDCRAFT_DIR` a él). En cualquier otra ubicación: define `SOUNDCRAFT_DIR` (carpeta, raíz del `.tar.gz` o `SoundCraft.app`) o `SOUNDCRAFT_CLI`.

- **macOS:** el DMG solo contiene la app. Descomprime el zip aparte de `soundcraft-cli` y mueve `soundcraft-cli` a `/usr/local/bin` (o apunta `SOUNDCRAFT_CLI` a él). La primera ejecución comprueba en línea la notarización de Apple.
- **Linux:** la AppImage y el Flatpak solo contienen la app, no `soundcraft-cli`; usa el deb, el rpm o el tar.gz. Para una app AppImage, define `SOUNDCRAFT_APP` para que `open_in_soundcraft` pueda abrirla. En un servidor sin GPU, la configuración verificada usó `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Cómo funciona

| Parte | Qué es |
| --- | --- |
| **Motor de SoundCraft** (`soundcraft-cli mcp`) | El propio motor de SoundCraft: pistas, clips, MIDI, los plugins integrados, mezclador, buses, automatización, procesamiento AudioSuite y los escritores WAV / AIFF / FLAC / MIDI / .scraft. Se inicia nuevo y **sin interfaz** en cada trabajo, así que nunca toca la app de SoundCraft ni sus dispositivos de audio. |
| **Servidor MCP** (Node.js) | 10 herramientas de alto nivel. Construye sesiones a partir de una descripción sencilla (pistas, clips en segundos, notas en tiempos, efectos, envíos), comprueba cada salida antes, mide la mezcla (pico, true peak, LUFS integrados) y dibuja una **imagen de la forma de onda** del resultado para que el asistente la vea. |
| **App en vivo** (opcional) | `open_in_soundcraft control=true` abre la app con su canal de control solo local (puerto 7801) y `run_soundcraft_commands live=true` la maneja. Cierra la app cuando termines. |

## Herramientas

| Herramienta | Qué hace |
| --- | --- |
| `create_session` | Una sesión multipista: pistas de audio con archivos colocados en el tiempo (ganancia de clip, fundidos), pistas de instrumento tocadas por el sintetizador sustractivo, la caja de ritmos General MIDI o un sampler a partir de notas en tiempos (con bucles), archivos MIDI, volumen, panorama, mute, solo, efectos de inserción, envíos a buses auxiliares, tempo, compás, tonalidad y marcadores. Escribe la mezcla, los stems, el MIDI y la sesión .scraft, con pico, LUFS y forma de onda |
| `edit_session` | Una sesión .scraft modificada: tempo, compás, tonalidad, marcadores, buses, pistas nuevas, pistas existentes renombradas, remezcladas, con nuevos efectos y envíos, o eliminadas; se guarda como copia nueva y mezcla |
| `export_session` | Una sesión, una lista o una carpeta → mezcla WAV / AIFF / FLAC (rango, normalización, profundidad de bits), stems, MIDI, con sonoridad |
| `process_audio` | Archivos de audio (uno, una lista o una carpeta): recortar, normalizar, ganancia, invertir el sentido o la polaridad, cambio de tono, estirar el tiempo, varispeed, efectos, fundidos, volumen y panorama → WAV, AIFF o FLAC |
| `convert_audio` | Archivos de audio → WAV, AIFF o FLAC, frecuencia de muestreo, profundidad de bits, normalización |
| `get_audio_info` | Formato, canales, frecuencia, profundidad de bits y duración de archivos de audio o las pistas de una sesión; opcionalmente sonoridad (pico, true peak, LUFS) y forma de onda |
| `list_soundcraft_catalog` | 469 comandos, los 27 plugins con cada parámetro (id, rango, unidad), nombres de notas de batería, formatos |
| `run_soundcraft_commands` | Cualquier comando del motor más `import_audio`, `inspect_session`, `bounce_mix`... en una sesión (referencias `$steps[N].campo`), sin interfaz o en vivo, y luego escribir salidas |
| `open_in_soundcraft` | Abre una sesión (o la canción de demostración) en la app de SoundCraft, opcionalmente con el canal de control |
| `get_soundcraft_status` | Plataforma, instalación, versión, comandos, plugins, cobertura de Pro Tools, app / puerto de control |

| | |
| --- | --- |
| **Lee** | WAV, AIFF, FLAC, MP3, OGG, M4A/AAC, ALAC, CAF, archivos MIDI estándar, sesiones .scraft |
| **Escribe** | WAV, AIFF, FLAC (16 / 24 bits, 32 bits flotante), stems, MIDI, sesiones .scraft (el audio se copia en "Audio Files") |

Los tiempos van en **segundos**; las notas, en **tiempos** (negras) desde el inicio de su clip. Las alturas son números MIDI, nombres como `C4` / `F#3` / `Bb2` o, para `drum_synth`, `kick`, `snare`, `clap`, `hat`, `open_hat`, `low_tom`, `mid_tom`, `high_tom`, `crash`, `ride`.

## Ejemplo

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

## Requisitos

- **SoundCraft** con `soundcraft-cli` (probado con **0.6.1**); ver [Plataformas](#plataformas)
- Node.js ≥ 20 (incluido en Claude Desktop para instalaciones `.mcpb`)

## Instalación

### Claude Desktop (recomendado, todas las plataformas)

1. Descarga `soundcraft-mcp-server.mcpb` de la [última versión](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest).
2. Haz doble clic (o arrástralo a Claude Desktop → *Configuración → Extensiones*) y pulsa **Instalar**.
3. Opcional: si SoundCraft no está en una ubicación estándar, indica su carpeta o la ruta de `soundcraft-cli` en la configuración de la extensión.

### Sunsam Code

Instala **SoundCraft Bridge** desde el marketplace de [Sunsam Code](https://github.com/jhonsu01/marketplace-SunsamCode), o suelta el `.mcpb` en *MCP → Instalar extensión*.

### Codex (OpenAI)

**Recomendado — el marketplace (recibe actualizaciones):** *Complementos → Añadir → Añadir marketplace*, origen `jhonsu01/craft-marketplace`, referencia `main`, y luego instala **SoundCraft Bridge** desde **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). Las versiones nuevas llegan al actualizar el marketplace. O sube el zip (Codex lo guarda en tu cuenta y rechaza un zip más nuevo con el mismo nombre):

1. Descarga `soundcraft-mcp-server-<versión>-codex.zip` de la [última versión](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest).
2. En Codex: *Complementos → Añadir → Nuevo complemento*, elige el zip y pulsa **Añadir complemento**.
3. Codex arranca el servidor con `node`, así que Node.js ≥ 20 debe estar en el `PATH`. Si SoundCraft no está en una ubicación estándar, define `SOUNDCRAFT_DIR` o `SOUNDCRAFT_CLI` como variables de entorno del sistema (Codex no tiene formulario de configuración para complementos locales).

### DeepSeek Harness

1. *Plugins → Add plugin*, escribe `github:jhonsu01/craft-marketplace#path:/plugins/soundcraft-mcp-server` y pulsa **Install** y luego **Enable now**.
2. Harness arranca el servidor con su propio cliente MCP y `node` (Node.js ≥ 20 en el `PATH`); las herramientas aparecen como `mcp__soundcraft__<herramienta>` y los archivos de salida como tarjetas que se abren en Harness.
3. Harness aún no actualiza los plugins por sí solo: para actualizar, desinstala el plugin y vuelve a instalarlo con la misma dirección.

### Claude Code / otros clientes MCP

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

## Configuración

| Variable | Significado |
| --- | --- |
| `SOUNDCRAFT_DIR` | Carpeta de SoundCraft, uno de sus ejecutables, la raíz de un `.tar.gz` (con `bin/`) o `SoundCraft.app`. Por defecto: detección automática |
| `SOUNDCRAFT_CLI` | Ruta de `soundcraft-cli` / `soundcraft-cli.exe` (tiene prioridad sobre `SOUNDCRAFT_DIR`) |
| `SOUNDCRAFT_APP` | Ruta de la app de escritorio cuando está en otro sitio (p. ej. una AppImage de Linux) |
| `SOUNDCRAFT_CONTROL_PORT` | Puerto de control de la app de escritorio (por defecto 7801) |
| `SOUNDCRAFT_MCP_TIMEOUT` | Segundos máximos por llamada al motor (por defecto 3600) |

## Seguridad

- Los archivos **nunca se sobrescriben** salvo con `overwrite: true`: en carpetas se usa un nombre libre (`_2`) y un `output_path` existente es un error. Las entradas solo se leen; un archivo editado solo se guarda como copia nueva (`_edited`).
- Todas las rutas deben ser absolutas. El motor se ejecuta sin interfaz y nunca toca la app de SoundCraft salvo con `live: true`.
- Todo se ejecuta en local, sin acceso a la red. Cada tarea usa un motor privado en una carpeta temporal que se borra al final.

## Desarrollo

```bash
npm run build       # TypeScript + bundle de un solo archivo (dist/bundle.cjs)
npm test            # pruebas unitarias (lógica de rutas de Windows, macOS y Linux)
npm run test:e2e    # 27 comprobaciones de extremo a extremo (29 con `E2E_LIVE=1`) por MCP stdio real (audio sintético)
npm run pack:mcpb   # soundcraft-mcp-server.mcpb
npm run pack:codex  # zip del plugin para Codex / DeepSeek Harness
```

Prueba de Linux en Docker (descomprime antes `soundcraft-<versión>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/ruta/a/soundcraft-0.6.1-linux-x86_64:/opt/soundcraft:ro" -e SOUNDCRAFT_DIR=/opt/soundcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licencia

Apache-2.0. SoundCraft es © de sus autores (Storytold), MIT o Apache-2.0.
Este proyecto no está afiliado ni respaldado por SoundCraft ni Storytold. Pro Tools es una marca de Avid.
