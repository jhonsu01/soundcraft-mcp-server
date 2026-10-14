<p align="center"><img src="icon.png" width="120" alt="SoundCraft Bridge 아이콘"></p>

<h1 align="center">SoundCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <b>한국어</b>
</p>

<p align="center">
  컴퓨터에 설치된 <b>SoundCraft</b>로 Claude가 음악과 오디오를 만들게 하세요 — <b>Windows, macOS, Linux</b>:<br>
  오디오 파일과 신스 또는 드럼 노트로 만드는 멀티트랙 곡, 효과와 버스, 라우드니스를 잰 믹스다운, 스템, MIDI, 오디오 처리와 변환.
</p>

---

## 왜 필요한가

[SoundCraft](https://github.com/storytold/soundcraft)는 오픈 소스 Pro Tools급 디지털 오디오 워크스테이션으로, 화면 없는 CLI(`soundcraft-cli`), 469개 명령, 27개 내장 플러그인(EQ, 다이내믹스, 리버브, 딜레이, 모듈레이션, 신스, 드럼 신스, 샘플러), MCP 모드를 갖추고 있습니다. 이 [Model Context Protocol](https://modelcontextprotocol.io) 서버는 그 엔진을 Claude용 **파일 입력 / 파일 출력 도구**로 바꿔 주므로, 이렇게 요청할 수 있습니다:

> *"110 BPM, A단조로 8마디 드럼과 베이스 루프를 만들고 WAV, 스템, MIDI로 내보내 줘."*
> *"이 목소리를 이 음악 위에 얹어 팟캐스트 인트로를 만들어 줘: 목소리 아래 음악, 페이드, 목소리에 컴프레서, -16 LUFS."*
> *"`D:\인터뷰`의 모든 녹음을 -1 dBFS로 노멀라이즈하고 처음 2초를 잘라 16비트 FLAC으로 저장해 줘."*
> *"이 샘플을 3반음 올리고, 음정은 그대로 두고 50 % 더 길게 해 줘."*
> *"이 마스터의 음량은(LUFS, 트루 피크)? 파형을 보여 줘."*

형제 프로젝트: [designcraft-mcp-server](https://github.com/jhonsu01/designcraft-mcp-server), [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server), [wordcraft-mcp-server](https://github.com/jhonsu01/wordcraft-mcp-server), [deckcraft-mcp-server](https://github.com/jhonsu01/deckcraft-mcp-server), [gridcraft-mcp-server](https://github.com/jhonsu01/gridcraft-mcp-server), [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## 플랫폼

| OS | 설치할 SoundCraft 패키지 | 서버가 찾는 위치(설정 불필요) | 상태 |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI 또는 포터블 zip | `C:\Program Files\SoundCraft`, `%LOCALAPPDATA%\Programs\SoundCraft`, `PATH` | ✅ 검증됨 (Windows 11) |
| **Linux** (x86_64, aarch64, riscv64) | `.deb`, `.rpm` 또는 `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/soundcraft/bin`, `~/.local/bin`, `PATH` | ✅ 검증됨 (Debian 12, 화면 없음) |
| **macOS** 11+ (Apple 실리콘 및 Intel) | `.dmg`(앱) **와 함께** `soundcraft-cli-<버전>-macos-universal.zip` | `/Applications/SoundCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 지원됨, Mac에서는 아직 미검증 |

모든 다운로드: [SoundCraft 릴리스](https://github.com/storytold/soundcraft/releases) (FreeBSD용 tar.gz도 있습니다. `SOUNDCRAFT_DIR`로 지정하세요). 다른 위치라면 `SOUNDCRAFT_DIR`(폴더, `.tar.gz` 루트 또는 `SoundCraft.app`)이나 `SOUNDCRAFT_CLI`를 설정하세요.

- **macOS:** DMG에는 앱만 들어 있습니다. 별도의 `soundcraft-cli` zip을 풀고 `soundcraft-cli`를 `/usr/local/bin`으로 옮기세요(또는 `SOUNDCRAFT_CLI`로 지정). 처음 실행할 때 Apple 공증을 온라인으로 확인합니다.
- **Linux:** AppImage와 Flatpak에는 앱만 있고 `soundcraft-cli`는 없습니다. deb, rpm 또는 tar.gz를 사용하세요. 앱이 AppImage라면 `open_in_soundcraft`가 실행할 수 있도록 `SOUNDCRAFT_APP`을 설정하세요. GPU가 없는 서버에서 검증한 환경은 `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`를 사용했습니다.

## 작동 방식

| 구성 요소 | 설명 |
| --- | --- |
| **SoundCraft 엔진** (`soundcraft-cli mcp`) | SoundCraft 자체 엔진: 트랙, 클립, MIDI, 내장 플러그인, 믹서, 버스, 오토메이션, AudioSuite 처리와 WAV / AIFF / FLAC / MIDI / .scraft 출력기. 작업마다 새로 **화면 없이** 시작되므로 SoundCraft 앱이나 오디오 장치를 절대 건드리지 않습니다. |
| **MCP 서버** (Node.js) | 10개의 고수준 도구. 간단한 설명(트랙, 초 단위 클립, 박 단위 노트, 효과, 센드)으로 세션을 만들고, 모든 출력을 미리 확인하고, 믹스를 측정하며(피크, 트루 피크, 통합 LUFS), 결과의 **파형 이미지**를 그려 어시스턴트가 볼 수 있게 합니다. |
| **라이브 앱** (선택) | `open_in_soundcraft control=true`는 로컬 전용 제어 채널(포트 7801)로 앱을 시작하고, `run_soundcraft_commands live=true`가 앱을 조작합니다. 작업이 끝나면 앱을 닫으세요. |

## 도구

| 도구 | 기능 |
| --- | --- |
| `create_session` | 멀티트랙 세션: 원하는 시간에 놓은 파일의 오디오 트랙(클립 게인, 페이드), 감산 신스·General MIDI 드럼 신스·샘플러가 박 단위 노트를 연주하는 악기 트랙(루프 가능), MIDI 파일, 볼륨, 팬, 뮤트, 솔로, 인서트 효과, AUX 버스로의 센드, 템포, 박자, 조, 마커. 믹스다운, 스템, MIDI, .scraft 세션을 쓰고 피크, LUFS, 파형을 돌려줍니다 |
| `edit_session` | .scraft 세션 변경: 템포, 박자, 조, 마커, 버스, 새 트랙, 기존 트랙 이름 변경·리믹스·효과와 센드 추가·삭제; 새 사본과 믹스다운으로 저장 |
| `export_session` | 세션 하나, 목록 또는 폴더 → WAV / AIFF / FLAC 믹스다운(범위, 노멀라이즈, 비트 깊이), 스템, MIDI, 라우드니스 포함 |
| `process_audio` | 오디오 파일(하나, 목록 또는 폴더): 트림, 노멀라이즈, 게인, 리버스, 극성 반전, 피치 시프트, 타임 스트레치, 바리스피드, 효과, 페이드, 볼륨과 팬 → WAV, AIFF 또는 FLAC |
| `convert_audio` | 오디오 파일 → WAV, AIFF 또는 FLAC, 샘플레이트, 비트 깊이, 노멀라이즈 |
| `get_audio_info` | 오디오 파일의 형식, 채널, 레이트, 비트 깊이, 길이 또는 세션의 트랙; 선택적으로 라우드니스(피크, 트루 피크, LUFS)와 파형 |
| `list_soundcraft_catalog` | 469개 명령, 27개 플러그인과 모든 매개변수(id, 범위, 단위), 드럼 노트 이름, 형식 |
| `run_soundcraft_commands` | 모든 엔진 명령과 `import_audio`, `inspect_session`, `bounce_mix`...를 한 세션에서 실행(`$steps[N].필드` 참조), 화면 없이 또는 라이브로 실행 후 출력 저장 |
| `open_in_soundcraft` | SoundCraft 앱에서 세션(또는 데모 곡) 열기(제어 채널 선택 가능) |
| `get_soundcraft_status` | 플랫폼, 설치, 버전, 명령, 플러그인, Pro Tools 지원 범위, 앱 / 제어 포트 |

| | |
| --- | --- |
| **읽기** | WAV, AIFF, FLAC, MP3, OGG, M4A/AAC, ALAC, CAF, 표준 MIDI 파일, .scraft 세션 |
| **쓰기** | WAV, AIFF, FLAC(16 / 24비트, 32비트 부동소수점), 스템, MIDI, .scraft 세션(오디오는 "Audio Files"로 복사) |

시간은 **초** 단위이고, 노트는 클립 시작부터의 **박**(4분음표) 단위입니다. 음높이는 MIDI 번호, `C4` / `F#3` / `Bb2` 같은 이름, 또는 `drum_synth`의 경우 `kick`, `snare`, `clap`, `hat`, `open_hat`, `low_tom`, `mid_tom`, `high_tom`, `crash`, `ride`입니다.

## 예시

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

## 요구 사항

- `soundcraft-cli`가 포함된 **SoundCraft**(**0.6.1**으로 검증), [플랫폼](#플랫폼) 참고
- Node.js ≥ 20 (`.mcpb`로 설치할 때는 Claude Desktop에 포함)

## 설치

### Claude Desktop (권장, 모든 플랫폼)

1. [최신 릴리스](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest)에서 `soundcraft-mcp-server.mcpb`를 내려받습니다.
2. 두 번 클릭하거나 Claude Desktop → *설정 → 확장 프로그램*으로 끌어다 놓고 **설치**를 누릅니다.
3. 선택: SoundCraft가 표준 위치에 없다면 확장 프로그램 설정에서 해당 폴더나 `soundcraft-cli` 경로를 입력합니다.

### Sunsam Code

[Sunsam Code](https://github.com/jhonsu01/marketplace-SunsamCode) 마켓플레이스에서 **SoundCraft Bridge**를 설치하거나 `.mcpb`를 *MCP → 확장 프로그램 설치*에 끌어다 놓으세요.

### Codex (OpenAI)

**권장 — 마켓플레이스(업데이트 받음):** *플러그인 → 추가 → 마켓플레이스 추가*에서 소스 `jhonsu01/craft-marketplace`, 참조 `main`을 지정한 뒤 **Craft Bridges**에서 **SoundCraft Bridge**를 설치합니다([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). 마켓플레이스를 새로 고치면 새 버전이 설치됩니다. 또는 zip을 업로드합니다(Codex는 계정에 저장하고 같은 이름의 새 zip은 거부합니다):

1. [최신 릴리스](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest)에서 `soundcraft-mcp-server-<버전>-codex.zip`을 내려받습니다.
2. Codex에서 *플러그인 → 추가 → 새 플러그인*을 열고 zip을 선택한 뒤 **플러그인 추가**를 누릅니다.
3. Codex는 `node`로 서버를 시작하므로 `PATH`에 Node.js ≥ 20이 있어야 합니다. SoundCraft가 표준 위치에 없다면 `SOUNDCRAFT_DIR` 또는 `SOUNDCRAFT_CLI`를 시스템 환경 변수로 설정하세요(Codex에는 로컬 플러그인용 설정 화면이 없습니다).

### DeepSeek Harness

1. *Plugins → Add plugin*에서 `github:jhonsu01/craft-marketplace#path:/plugins/soundcraft-mcp-server`를 입력하고 **Install**, 이어서 **Enable now**를 누릅니다.
2. Harness는 자체 MCP 클라이언트와 `node`(`PATH`에 Node.js ≥ 20 필요)로 서버를 시작합니다. 도구는 `mcp__soundcraft__<도구>`로 표시되고, 출력 파일은 Harness에서 열리는 카드로 표시됩니다.
3. Harness는 아직 플러그인을 자동으로 업데이트하지 않습니다. 업데이트하려면 플러그인을 제거한 뒤 같은 주소로 다시 설치하세요.

### Claude Code / 기타 MCP 클라이언트

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

## 설정

| 변수 | 의미 |
| --- | --- |
| `SOUNDCRAFT_DIR` | SoundCraft 폴더, 그 안의 실행 파일, `.tar.gz` 루트(`bin/` 포함) 또는 `SoundCraft.app`. 기본값: 자동 감지 |
| `SOUNDCRAFT_CLI` | `soundcraft-cli` / `soundcraft-cli.exe` 경로(`SOUNDCRAFT_DIR`보다 우선) |
| `SOUNDCRAFT_APP` | 데스크톱 앱이 다른 곳에 있을 때의 경로(예: Linux AppImage) |
| `SOUNDCRAFT_CONTROL_PORT` | 데스크톱 앱의 제어 포트(기본값 7801) |
| `SOUNDCRAFT_MCP_TIMEOUT` | 엔진 호출당 최대 초(기본값 3600) |

## 안전

- `overwrite: true`가 아니면 파일을 **절대 덮어쓰지 않습니다**: 폴더에서는 빈 이름(`_2`)을 쓰고, 이미 있는 `output_path`는 오류입니다. 입력 파일은 읽기만 하며, 편집한 파일은 새 사본(`_edited`)으로만 저장됩니다.
- 모든 경로는 절대 경로여야 합니다. 엔진은 화면 없이 실행되며, `live: true`가 아니면 SoundCraft 앱을 건드리지 않습니다.
- 모든 작업은 네트워크 접근 없이 로컬에서 실행됩니다. 작업마다 임시 폴더에서 전용 엔진을 사용하고, 끝나면 폴더를 삭제합니다.

## 개발

```bash
npm run build       # TypeScript + 단일 파일 번들(dist/bundle.cjs)
npm test            # 단위 테스트(Windows, macOS, Linux 경로 처리)
npm run test:e2e    # 실제 MCP stdio로 27개 엔드투엔드 검사(`E2E_LIVE=1`이면 29개, 합성 오디오)
npm run pack:mcpb   # soundcraft-mcp-server.mcpb
npm run pack:codex  # Codex / DeepSeek Harness 플러그인 zip
```

Docker에서 Linux 테스트(먼저 `soundcraft-<버전>-linux-x86_64.tar.gz`를 풀어 두세요):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/soundcraft-0.6.1-linux-x86_64:/opt/soundcraft:ro" -e SOUNDCRAFT_DIR=/opt/soundcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## 라이선스

Apache-2.0. SoundCraft의 저작권은 저작자(Storytold)에게 있으며 MIT 또는 Apache-2.0으로 제공됩니다.
이 프로젝트는 SoundCraft 또는 Storytold와 관련이 없으며 이들의 보증을 받지 않았습니다. Pro Tools은(는) Avid의 상표입니다.
