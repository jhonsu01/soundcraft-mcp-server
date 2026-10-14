<p align="center"><img src="icon.png" width="120" alt="SoundCraft Bridge 图标"></p>

<h1 align="center">SoundCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <b>简体中文</b> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  让 Claude 使用你电脑上安装的 <b>SoundCraft</b> 制作音乐和音频 —— <b>Windows、macOS 和 Linux</b>：<br>
  用音频文件和合成器或鼓的音符制作多轨歌曲，效果和总线，带响度测量的混音，分轨，MIDI，音频处理与转换。
</p>

---

## 为什么

[SoundCraft](https://github.com/storytold/soundcraft) 是一款开源的 Pro Tools 级数字音频工作站，带有无界面 CLI（`soundcraft-cli`）、469 条命令、27 个内置插件（均衡、动态、混响、延迟、调制、合成器、鼓合成器、采样器）以及 MCP 模式。本 [Model Context Protocol](https://modelcontextprotocol.io) 服务器把这个引擎变成 Claude 可用的 **“文件进 / 文件出”工具**，你可以这样提问：

> *“做一个 110 BPM、A 小调、8 小节的鼓和贝斯循环，导出 WAV、分轨和 MIDI。”*
> *“把这段人声放在这段音乐上做播客片头：音乐压在人声下面，淡入淡出，人声加压缩，-16 LUFS。”*
> *“把 `D:\访谈` 里所有录音归一化到 -1 dBFS，剪掉前 2 秒，保存为 16 位 FLAC。”*
> *“把这个采样升高 3 个半音，并在不改变音高的情况下拉长 50 %。”*
> *“这个母带有多响（LUFS、真峰值）？给我看看它的波形。”*

同系列项目： [designcraft-mcp-server](https://github.com/jhonsu01/designcraft-mcp-server), [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server), [wordcraft-mcp-server](https://github.com/jhonsu01/wordcraft-mcp-server), [deckcraft-mcp-server](https://github.com/jhonsu01/deckcraft-mcp-server), [gridcraft-mcp-server](https://github.com/jhonsu01/gridcraft-mcp-server) 和 [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## 平台

| 系统 | 需要安装的 SoundCraft 包 | 服务器自动查找的位置（无需配置） | 状态 |
| --- | --- | --- | --- |
| **Windows** 10/11（x64、x86、arm64） | MSI 或便携 zip | `C:\Program Files\SoundCraft`、`%LOCALAPPDATA%\Programs\SoundCraft`、`PATH` | ✅ 已验证（Windows 11） |
| **Linux**（x86_64、aarch64） | `.deb`、`.rpm` 或 `.tar.gz` | `/usr/bin`、`/usr/local/bin`、`/opt/soundcraft/bin`、`~/.local/bin`、`PATH` | ✅ 已验证（Debian 12，无界面） |
| **macOS** 11+（Apple 芯片和 Intel） | `.dmg`（应用）**加上** `soundcraft-cli-<版本>-macos-universal.zip` | `/Applications/SoundCraft.app`、`/usr/local/bin`、`/opt/homebrew/bin`、`~/.local/bin`、`~/bin`、`PATH` | 🟡 已支持，尚未在 Mac 上测试 |

全部下载：[SoundCraft 发布页](https://github.com/storytold/soundcraft/releases)（另有 FreeBSD 的 tar.gz，将 `SOUNDCRAFT_DIR` 指向它即可）。其他位置：设置 `SOUNDCRAFT_DIR`（文件夹、`.tar.gz` 根目录或 `SoundCraft.app`）或 `SOUNDCRAFT_CLI`。

- **macOS：** DMG 只包含应用。解压单独的 `soundcraft-cli` zip，把 `soundcraft-cli` 移到 `/usr/local/bin`（或用 `SOUNDCRAFT_CLI` 指向它）。首次运行会联网检查 Apple 公证。
- **Linux：** AppImage 和 Flatpak 只包含应用，不含 `soundcraft-cli`；请使用 deb、rpm 或 tar.gz。若应用是 AppImage，请设置 `SOUNDCRAFT_APP`，以便 `open_in_soundcraft` 能启动它。在没有 GPU 的服务器上，已验证的环境安装了 `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`。

## 工作原理

| 组成部分 | 说明 |
| --- | --- |
| **SoundCraft 引擎**（`soundcraft-cli mcp`） | SoundCraft 自己的引擎：音轨、片段、MIDI、内置插件、调音台、总线、自动化、AudioSuite 处理以及 WAV / AIFF / FLAC / MIDI / .scraft 写出器。每个任务都以全新的**无界面**方式启动，绝不会碰到 SoundCraft 应用或它的音频设备。 |
| **MCP 服务器**（Node.js） | 10 个高层工具。根据简单的描述（音轨、以秒计的片段、以拍计的音符、效果、发送）构建会话，提前检查每个输出，测量混音（峰值、真峰值、综合 LUFS），并绘制结果的**波形图**让助手看到。 |
| **实时应用**（可选） | `open_in_soundcraft control=true` 以仅限本机的控制通道（端口 7801）启动应用，`run_soundcraft_commands live=true` 对其进行操作。用完请关闭应用。 |

## 工具

| 工具 | 功能 |
| --- | --- |
| `create_session` | 多轨会话：按时间放置的音频文件音轨（片段增益、淡入淡出），由减法合成器、General MIDI 鼓合成器或采样器按拍演奏音符的乐器音轨（可循环），MIDI 文件，音量、声像、静音、独奏、插入效果、发送到辅助总线，速度、拍号、调性、标记。写出混音、分轨、MIDI 和 .scraft 会话，并给出峰值、LUFS 和波形 |
| `edit_session` | 修改 .scraft 会话：速度、拍号、调性、标记、总线、新音轨，现有音轨重命名、重新混音、添加效果和发送或删除；另存为新副本并混音 |
| `export_session` | 单个会话、列表或文件夹 → WAV / AIFF / FLAC 混音（范围、归一化、位深）、分轨、MIDI，并给出响度 |
| `process_audio` | 音频文件（单个、列表或文件夹）：裁剪、归一化、增益、倒放、反相、变调、时间拉伸、变速、效果、淡入淡出、音量和声像 → WAV、AIFF 或 FLAC |
| `convert_audio` | 音频文件 → WAV、AIFF 或 FLAC，采样率、位深、归一化 |
| `get_audio_info` | 音频文件的格式、声道、采样率、位深和时长，或会话的音轨；可选响度（峰值、真峰值、LUFS）和波形 |
| `list_soundcraft_catalog` | 469 条命令、27 个插件及其每个参数（id、范围、单位）、鼓音符名称、格式 |
| `run_soundcraft_commands` | 在一个会话中运行任意引擎命令以及 `import_audio`、`inspect_session`、`bounce_mix`...（支持 `$steps[N].字段` 引用），无界面或实时模式，然后写出结果 |
| `open_in_soundcraft` | 在 SoundCraft 应用中打开会话（或演示歌曲），可选启用控制通道 |
| `get_soundcraft_status` | 平台、安装、版本、命令、插件、Pro Tools 覆盖率、应用 / 控制端口 |

| | |
| --- | --- |
| **读取** | WAV、AIFF、FLAC、MP3、OGG、M4A/AAC、ALAC、CAF、标准 MIDI 文件、.scraft 会话 |
| **写出** | WAV、AIFF、FLAC（16 / 24 位、32 位浮点）、分轨、MIDI、.scraft 会话（音频复制到 "Audio Files"） |

时间以**秒**为单位；音符以从片段开头算起的**拍**（四分音符）为单位。音高可以是 MIDI 编号、`C4` / `F#3` / `Bb2` 这样的名称，或对 `drum_synth` 使用 `kick`、`snare`、`clap`、`hat`、`open_hat`、`low_tom`、`mid_tom`、`high_tom`、`crash`、`ride`。

## 示例

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

## 要求

- 带 `soundcraft-cli` 的 **SoundCraft**（已用 **0.6.1** 测试）；见[平台](#平台)
- Node.js ≥ 20（通过 `.mcpb` 安装时由 Claude Desktop 自带）

## 安装

### Claude Desktop（推荐，所有平台）

1. 从[最新发布](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest)下载 `soundcraft-mcp-server.mcpb`。
2. 双击它（或拖入 Claude Desktop → *设置 → 扩展*），然后点击 **安装**。
3. 可选：如果 SoundCraft 不在标准位置，在扩展设置中填写其文件夹或 `soundcraft-cli` 的路径。

### Sunsam Code

从 [Sunsam Code](https://github.com/jhonsu01/marketplace-SunsamCode) 插件市场安装 **SoundCraft Bridge**，或把 `.mcpb` 拖到 *MCP → 安装扩展*。

### Codex（OpenAI）

**推荐 —— 插件市场（可获得更新）：** *插件 → 添加 → 添加插件市场*，来源 `jhonsu01/craft-marketplace`，引用 `main`，然后从 **Craft Bridges** 安装 **SoundCraft Bridge**（[craft-marketplace](https://github.com/jhonsu01/craft-marketplace)）。刷新插件市场即可获得新版本。或者上传 zip（Codex 会把它保存在你的账户中，并拒绝同名的新版 zip）：

1. 从[最新发布](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest)下载 `soundcraft-mcp-server-<版本>-codex.zip`。
2. 在 Codex 中：*插件 → 添加 → 新插件*，选择该 zip，然后点击 **添加插件**。
3. Codex 用 `node` 启动服务器，因此 `PATH` 中必须有 Node.js ≥ 20。如果 SoundCraft 不在标准位置，请把 `SOUNDCRAFT_DIR` 或 `SOUNDCRAFT_CLI` 设为系统环境变量（Codex 没有本地插件的设置表单）。

### DeepSeek Harness

1. *Plugins → Add plugin*，输入 `github:jhonsu01/craft-marketplace#path:/plugins/soundcraft-mcp-server`，点击 **Install**，再点击 **Enable now**。
2. Harness 用自带的 MCP 客户端和 `node`（`PATH` 中需有 Node.js ≥ 20）启动服务器；工具显示为 `mcp__soundcraft__<工具>`，输出文件显示为可在 Harness 中打开的卡片。
3. Harness 目前不会自动更新插件：要更新，请卸载插件后用同一地址重新安装。

### Claude Code / 其他 MCP 客户端

```bash
git clone https://github.com/jhonsu01/soundcraft-mcp-server.git
cd soundcraft-mcp-server
npm install
npm run build
```

Windows：

```bash
claude mcp add soundcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux：

```bash
claude mcp add soundcraft -- node "$PWD/dist/bundle.cjs"
```

## 配置

| 变量 | 含义 |
| --- | --- |
| `SOUNDCRAFT_DIR` | SoundCraft 文件夹、其中某个可执行文件、`.tar.gz` 根目录（含 `bin/`）或 `SoundCraft.app`。默认：自动检测 |
| `SOUNDCRAFT_CLI` | `soundcraft-cli` / `soundcraft-cli.exe` 的路径（优先于 `SOUNDCRAFT_DIR`） |
| `SOUNDCRAFT_APP` | 桌面应用在其他位置时的路径（例如 Linux 的 AppImage） |
| `SOUNDCRAFT_CONTROL_PORT` | 桌面应用的控制端口（默认 7801） |
| `SOUNDCRAFT_MCP_TIMEOUT` | 每次调用引擎的最长秒数（默认 3600） |

## 安全

- 除非设置 `overwrite: true`，否则**绝不覆盖**文件：在文件夹中会使用空闲的名称（`_2`），已存在的 `output_path` 会报错。输入文件只读；编辑后的文件只会另存为新副本（`_edited`）。
- 所有路径必须是绝对路径。引擎以无界面方式运行，除非 `live: true`，绝不会影响 SoundCraft 应用。
- 一切都在本地运行，不访问网络。每个任务使用独立引擎，运行在结束后会被删除的临时文件夹中。

## 开发

```bash
npm run build       # TypeScript + 单文件 bundle（dist/bundle.cjs）
npm test            # 单元测试（Windows、macOS 和 Linux 路径逻辑）
npm run test:e2e    # 27 项端到端检查（`E2E_LIVE=1` 时 29 项），通过真实 MCP stdio 运行（合成音频）
npm run pack:mcpb   # soundcraft-mcp-server.mcpb
npm run pack:codex  # Codex / DeepSeek Harness 插件 zip
```

在 Docker 中测试 Linux（先解压 `soundcraft-<版本>-linux-x86_64.tar.gz`）：

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/soundcraft-0.6.1-linux-x86_64:/opt/soundcraft:ro" -e SOUNDCRAFT_DIR=/opt/soundcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## 许可证

Apache-2.0。SoundCraft 版权归其作者（Storytold）所有，采用 MIT 或 Apache-2.0。
本项目与 SoundCraft 或 Storytold 无关，也未获其认可。Pro Tools 是 Avid 的商标。
