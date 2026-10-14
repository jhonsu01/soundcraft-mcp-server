<p align="center"><img src="icon.png" width="120" alt="Значок SoundCraft Bridge"></p>

<h1 align="center">SoundCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <b>Русский</b> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Позвольте Claude создавать музыку и звук с помощью <b>SoundCraft</b>, установленного на вашем компьютере, — <b>Windows, macOS и Linux</b>:<br>
  многодорожечные треки из аудиофайлов и нот синтезатора или ударных, эффекты и шины, сведение с измерением громкости, стемы, MIDI, обработка и конвертация аудио.
</p>

---

## Зачем

[SoundCraft](https://github.com/storytold/soundcraft) — цифровая звуковая рабочая станция с открытым исходным кодом уровня Pro Tools, с CLI без интерфейса (`soundcraft-cli`), 469 командами, 27 встроенными плагинами (эквалайзеры, динамика, ревербераторы, задержки, модуляция, синтезаторы, драм-синтезатор, сэмплер) и режимом MCP. Этот сервер [Model Context Protocol](https://modelcontextprotocol.io) превращает движок в **инструменты «файл на входе / файл на выходе»** для Claude, чтобы можно было просить, например:

> *«Сделай 8-тактовую петлю ударных и баса на 110 BPM в ля миноре и экспортируй WAV, стемы и MIDI.»*
> *«Наложи этот голос на эту музыку для начала подкаста: музыка под голосом, фейды, компрессор на голосе, -16 LUFS.»*
> *«Нормализуй все записи из `D:\Интервью` до -1 dBFS, обрежь первые 2 секунды и сохрани 16-битный FLAC.»*
> *«Подними этот сэмпл на 3 полутона и сделай его на 50 % длиннее без изменения высоты.»*
> *«Насколько громкий этот мастер (LUFS, true peak)? Покажи его волновую форму.»*

Родственные проекты: [designcraft-mcp-server](https://github.com/jhonsu01/designcraft-mcp-server), [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server), [wordcraft-mcp-server](https://github.com/jhonsu01/wordcraft-mcp-server), [deckcraft-mcp-server](https://github.com/jhonsu01/deckcraft-mcp-server), [gridcraft-mcp-server](https://github.com/jhonsu01/gridcraft-mcp-server) и [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Платформы

| ОС | Какой пакет SoundCraft установить | Где сервер его находит (без настройки) | Статус |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI или переносной zip | `C:\Program Files\SoundCraft`, `%LOCALAPPDATA%\Programs\SoundCraft`, `PATH` | ✅ Проверено (Windows 11) |
| **Linux** (x86_64, aarch64, riscv64) | `.deb`, `.rpm` или `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/soundcraft/bin`, `~/.local/bin`, `PATH` | ✅ Проверено (Debian 12, без графики) |
| **macOS** 11+ (Apple silicon и Intel) | `.dmg` (приложение) **плюс** `soundcraft-cli-<версия>-macos-universal.zip` | `/Applications/SoundCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Поддерживается, на Mac ещё не проверено |

Все загрузки: [релизы SoundCraft](https://github.com/storytold/soundcraft/releases) (есть и tar.gz для FreeBSD — укажите его в `SOUNDCRAFT_DIR`). В любом другом месте задайте `SOUNDCRAFT_DIR` (папка, корень `.tar.gz` или `SoundCraft.app`) или `SOUNDCRAFT_CLI`.

- **macOS:** в DMG только само приложение. Распакуйте отдельный zip с `soundcraft-cli` и переместите `soundcraft-cli` в `/usr/local/bin` (или укажите его в `SOUNDCRAFT_CLI`). При первом запуске нотаризация Apple проверяется через интернет.
- **Linux:** AppImage и Flatpak содержат только приложение, без `soundcraft-cli`; используйте deb, rpm или tar.gz. Для приложения в AppImage задайте `SOUNDCRAFT_APP`, чтобы `open_in_soundcraft` мог его запустить. На сервере без GPU в проверенной конфигурации использовались `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Как это работает

| Часть | Что это |
| --- | --- |
| **Движок SoundCraft** (`soundcraft-cli mcp`) | Собственный движок SoundCraft: дорожки, клипы, MIDI, встроенные плагины, микшер, шины, автоматизация, обработка AudioSuite и модули записи WAV / AIFF / FLAC / MIDI / .scraft. Запускается заново и **без интерфейса** для каждой задачи, поэтому никогда не трогает приложение SoundCraft и его аудиоустройства. |
| **Сервер MCP** (Node.js) | 10 высокоуровневых инструментов. Собирает сессии из простого описания (дорожки, клипы в секундах, ноты в долях, эффекты, посылы), заранее проверяет каждый выходной файл, измеряет микс (пик, true peak, интегральная громкость LUFS) и рисует **изображение волновой формы** результата, чтобы ассистент его видел. |
| **Приложение вживую** (необязательно) | `open_in_soundcraft control=true` запускает приложение с каналом управления только для локальных подключений (порт 7801), а `run_soundcraft_commands live=true` управляет им. Закройте приложение, когда закончите. |

## Инструменты

| Инструмент | Что делает |
| --- | --- |
| `create_session` | Многодорожечная сессия: аудиодорожки из файлов в нужное время (усиление клипа, фейды), инструментальные дорожки, которые играет субтрактивный синтезатор, драм-синтезатор General MIDI или сэмплер по нотам в долях (с повторами), MIDI-файлы, громкость, панорама, mute, solo, insert-эффекты, посылы на вспомогательные шины, темп, размер, тональность, маркеры. Записывает микс, стемы, MIDI и сессию .scraft с пиком, LUFS и волновой формой |
| `edit_session` | Изменённая сессия .scraft: темп, размер, тональность, маркеры, шины, новые дорожки, существующие дорожки переименованы, пересведены, с новыми эффектами и посылами или удалены; сохраняется как новая копия и микс |
| `export_session` | Сессия, список или папка → микс WAV / AIFF / FLAC (диапазон, нормализация, разрядность), стемы, MIDI, с громкостью |
| `process_audio` | Аудиофайлы (один, список или папка): обрезка, нормализация, усиление, реверс, инверсия полярности, смена высоты, растяжение времени, varispeed, эффекты, фейды, громкость и панорама → WAV, AIFF или FLAC |
| `convert_audio` | Аудиофайлы → WAV, AIFF или FLAC, частота дискретизации, разрядность, нормализация |
| `get_audio_info` | Формат, каналы, частота, разрядность и длительность аудиофайлов или дорожки сессии; при желании громкость (пик, true peak, LUFS) и волновая форма |
| `list_soundcraft_catalog` | 469 команд, 27 плагинов со всеми параметрами (id, диапазон, единица), названия нот ударных, форматы |
| `run_soundcraft_commands` | Любые команды движка плюс `import_audio`, `inspect_session`, `bounce_mix`... в одной сессии (ссылки `$steps[N].поле`), без интерфейса или вживую, затем запись результатов |
| `open_in_soundcraft` | Открывает сессию (или демо-трек) в приложении SoundCraft, при желании с каналом управления |
| `get_soundcraft_status` | Платформа, установка, версия, команды, плагины, покрытие Pro Tools, приложение / порт управления |

| | |
| --- | --- |
| **Читает** | WAV, AIFF, FLAC, MP3, OGG, M4A/AAC, ALAC, CAF, стандартные MIDI-файлы, сессии .scraft |
| **Записывает** | WAV, AIFF, FLAC (16 / 24 бита, 32 бита с плавающей точкой), стемы, MIDI, сессии .scraft (аудио копируется в «Audio Files») |

Время указывается в **секундах**; ноты — в **долях** (четвертях) от начала клипа. Высота — номер MIDI, имя вроде `C4` / `F#3` / `Bb2` или, для `drum_synth`, `kick`, `snare`, `clap`, `hat`, `open_hat`, `low_tom`, `mid_tom`, `high_tom`, `crash`, `ride`.

## Пример

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

## Требования

- **SoundCraft** с `soundcraft-cli` (проверено на **0.6.1**); см. [Платформы](#платформы)
- Node.js ≥ 20 (входит в Claude Desktop при установке `.mcpb`)

## Установка

### Claude Desktop (рекомендуется, все платформы)

1. Скачайте `soundcraft-mcp-server.mcpb` из [последнего релиза](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest).
2. Дважды щёлкните по файлу (или перетащите его в Claude Desktop → *Настройки → Расширения*) и нажмите **Установить**.
3. По желанию: если SoundCraft установлен не в стандартное место, укажите его папку или путь к `soundcraft-cli` в настройках расширения.

### Sunsam Code

Установите **SoundCraft Bridge** из маркетплейса [Sunsam Code](https://github.com/jhonsu01/marketplace-SunsamCode) или перетащите `.mcpb` в *MCP → Установить расширение*.

### Codex (OpenAI)

**Рекомендуется — маркетплейс (получает обновления):** *Плагины → Добавить → Добавить маркетплейс*, источник `jhonsu01/craft-marketplace`, ссылка `main`, затем установите **SoundCraft Bridge** из **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). Новые версии приходят при обновлении маркетплейса. Или загрузите zip (Codex сохранит его в вашей учётной записи и отклонит более новый zip с тем же именем):

1. Скачайте `soundcraft-mcp-server-<версия>-codex.zip` из [последнего релиза](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest).
2. В Codex: *Плагины → Добавить → Новый плагин*, выберите zip и нажмите **Добавить плагин**.
3. Codex запускает сервер через `node`, поэтому Node.js ≥ 20 должен быть в `PATH`. Если SoundCraft установлен не в стандартное место, задайте `SOUNDCRAFT_DIR` или `SOUNDCRAFT_CLI` как системные переменные окружения (у Codex нет формы настроек для локальных плагинов).

### DeepSeek Harness

1. *Plugins → Add plugin*, введите `github:jhonsu01/craft-marketplace#path:/plugins/soundcraft-mcp-server` и нажмите **Install**, затем **Enable now**.
2. Harness запускает сервер через свой MCP-клиент и `node` (Node.js ≥ 20 в `PATH`); инструменты появляются как `mcp__soundcraft__<инструмент>`, а выходные файлы — как карточки, которые открываются в Harness.
3. Harness пока не обновляет плагины сам: чтобы обновить, удалите плагин и установите его снова по тому же адресу.

### Claude Code / другие MCP-клиенты

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

## Настройка

| Переменная | Значение |
| --- | --- |
| `SOUNDCRAFT_DIR` | Папка SoundCraft, один из его исполняемых файлов, корень `.tar.gz` (с `bin/`) или `SoundCraft.app`. По умолчанию: автоопределение |
| `SOUNDCRAFT_CLI` | Путь к `soundcraft-cli` / `soundcraft-cli.exe` (важнее, чем `SOUNDCRAFT_DIR`) |
| `SOUNDCRAFT_APP` | Путь к настольному приложению, если оно лежит в другом месте (например, AppImage в Linux) |
| `SOUNDCRAFT_CONTROL_PORT` | Порт управления настольным приложением (по умолчанию 7801) |
| `SOUNDCRAFT_MCP_TIMEOUT` | Максимум секунд на один вызов движка (по умолчанию 3600) |

## Безопасность

- Файлы **никогда не перезаписываются** без `overwrite: true`: в папках берётся свободное имя (`_2`), а существующий `output_path` — ошибка. Входные файлы только читаются; изменённый файл сохраняется только как новая копия (`_edited`).
- Все пути должны быть абсолютными. Движок работает без окна и никогда не трогает приложение SoundCraft, если не указано `live: true`.
- Всё выполняется локально, без доступа к сети. Каждая задача использует отдельный движок во временной папке, которая удаляется в конце.

## Разработка

```bash
npm run build       # TypeScript + бандл в одном файле (dist/bundle.cjs)
npm test            # модульные тесты (логика путей Windows, macOS и Linux)
npm run test:e2e    # 27 сквозных проверок (29 с `E2E_LIVE=1`) через настоящий MCP stdio (синтетическое аудио)
npm run pack:mcpb   # soundcraft-mcp-server.mcpb
npm run pack:codex  # zip плагина для Codex / DeepSeek Harness
```

Проверка Linux в Docker (сначала распакуйте `soundcraft-<версия>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/путь/к/soundcraft-0.6.1-linux-x86_64:/opt/soundcraft:ro" -e SOUNDCRAFT_DIR=/opt/soundcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Лицензия

Apache-2.0. SoundCraft © его авторы (Storytold), MIT или Apache-2.0.
Этот проект не связан с SoundCraft или Storytold и не одобрен ими. Pro Tools — товарный знак Avid.
