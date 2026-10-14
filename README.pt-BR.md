<p align="center"><img src="icon.png" width="120" alt="Ícone do SoundCraft Bridge"></p>

<h1 align="center">SoundCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <b>Português</b> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Deixe o Claude fazer música e áudio com o <b>SoundCraft</b> instalado no seu computador — <b>Windows, macOS e Linux</b>:<br>
  músicas multipista com arquivos de áudio e notas de sintetizador ou bateria, efeitos e buses, mixagens com loudness, stems, MIDI, processamento e conversão de áudio.
</p>

---

## Por quê

[SoundCraft](https://github.com/storytold/soundcraft) é uma estação de trabalho de áudio digital de código aberto no estilo do Pro Tools, com uma CLI sem interface (`soundcraft-cli`), 469 comandos, 27 plugins integrados (EQ, dinâmica, reverbs, delays, modulação, sintetizadores, bateria eletrônica, sampler) e um modo MCP. Este servidor [Model Context Protocol](https://modelcontextprotocol.io) transforma esse motor em **ferramentas de arquivo de entrada / arquivo de saída** para o Claude, para você pedir coisas como:

> *"Faça um loop de bateria e baixo de 8 compassos a 110 BPM em Lá menor e exporte WAV, stems e MIDI."*
> *"Coloque esta voz sobre esta música para a abertura de um podcast: música por baixo da voz, fades, compressor na voz, -16 LUFS."*
> *"Normalize todas as gravações de `D:\Entrevistas` para -1 dBFS, corte os 2 primeiros segundos e salve FLAC de 16 bits."*
> *"Suba este sample 3 semitons e deixe-o 50 % mais longo sem mudar o tom."*
> *"Qual é o volume deste master (LUFS, true peak)? Mostre a forma de onda."*

Irmão de [designcraft-mcp-server](https://github.com/jhonsu01/designcraft-mcp-server), [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server), [wordcraft-mcp-server](https://github.com/jhonsu01/wordcraft-mcp-server), [deckcraft-mcp-server](https://github.com/jhonsu01/deckcraft-mcp-server), [gridcraft-mcp-server](https://github.com/jhonsu01/gridcraft-mcp-server) e [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plataformas

| SO | Pacote do SoundCraft a instalar | Onde o servidor o encontra (sem configuração) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI ou zip portátil | `C:\Program Files\SoundCraft`, `%LOCALAPPDATA%\Programs\SoundCraft`, `PATH` | ✅ Verificado (Windows 11) |
| **Linux** (x86_64, aarch64, riscv64) | `.deb`, `.rpm` ou `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/soundcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verificado (Debian 12, sem interface) |
| **macOS** 11+ (Apple silicon e Intel) | `.dmg` (o app) **mais** `soundcraft-cli-<versão>-macos-universal.zip` | `/Applications/SoundCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Suportado, ainda não testado em um Mac |

Todos os downloads: [versões do SoundCraft](https://github.com/storytold/soundcraft/releases) (também há um tar.gz para FreeBSD; aponte `SOUNDCRAFT_DIR` para ele). Em qualquer outro lugar: defina `SOUNDCRAFT_DIR` (pasta, raiz do `.tar.gz` ou `SoundCraft.app`) ou `SOUNDCRAFT_CLI`.

- **macOS:** o DMG contém só o app. Descompacte o zip separado do `soundcraft-cli` e mova `soundcraft-cli` para `/usr/local/bin` (ou aponte `SOUNDCRAFT_CLI` para ele). A primeira execução verifica online a notarização da Apple.
- **Linux:** o AppImage e o Flatpak contêm só o app, não o `soundcraft-cli`; use o deb, o rpm ou o tar.gz. Para um app AppImage, defina `SOUNDCRAFT_APP` para que `open_in_soundcraft` possa abri-lo. Em um servidor sem GPU, a configuração verificada usou `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Como funciona

| Parte | O que é |
| --- | --- |
| **Motor do SoundCraft** (`soundcraft-cli mcp`) | O próprio motor do SoundCraft: faixas, clipes, MIDI, os plugins integrados, mixer, buses, automação, processamento AudioSuite e os gravadores WAV / AIFF / FLAC / MIDI / .scraft. Iniciado do zero e **sem interface** a cada tarefa, então nunca mexe no app do SoundCraft nem nos dispositivos de áudio. |
| **Servidor MCP** (Node.js) | 10 ferramentas de alto nível. Monta sessões a partir de uma descrição simples (faixas, clipes em segundos, notas em tempos, efeitos, envios), verifica cada saída antes, mede a mixagem (pico, true peak, LUFS integrado) e desenha uma **imagem da forma de onda** do resultado para o assistente ver. |
| **App ao vivo** (opcional) | `open_in_soundcraft control=true` abre o app com seu canal de controle apenas local (porta 7801) e `run_soundcraft_commands live=true` o controla. Feche o app ao terminar. |

## Ferramentas

| Ferramenta | O que faz |
| --- | --- |
| `create_session` | Uma sessão multipista: faixas de áudio com arquivos posicionados no tempo (ganho de clipe, fades), faixas de instrumento tocadas pelo sintetizador subtrativo, pela bateria General MIDI ou por um sampler a partir de notas em tempos (com loops), arquivos MIDI, volume, pan, mute, solo, efeitos de inserção, envios para buses auxiliares, tempo, compasso, tonalidade e marcadores. Grava a mixagem, os stems, o MIDI e a sessão .scraft, com pico, LUFS e forma de onda |
| `edit_session` | Uma sessão .scraft alterada: tempo, compasso, tonalidade, marcadores, buses, novas faixas, faixas existentes renomeadas, remixadas, com novos efeitos e envios, ou removidas; salva como nova cópia e mixagem |
| `export_session` | Uma sessão, uma lista ou uma pasta → mixagem WAV / AIFF / FLAC (intervalo, normalização, profundidade de bits), stems, MIDI, com loudness |
| `process_audio` | Arquivos de áudio (um, uma lista ou uma pasta): cortar, normalizar, ganho, inverter o sentido ou a polaridade, mudança de tom, esticar o tempo, varispeed, efeitos, fades, volume e pan → WAV, AIFF ou FLAC |
| `convert_audio` | Arquivos de áudio → WAV, AIFF ou FLAC, taxa de amostragem, profundidade de bits, normalização |
| `get_audio_info` | Formato, canais, taxa, profundidade de bits e duração de arquivos de áudio ou as faixas de uma sessão; opcionalmente loudness (pico, true peak, LUFS) e forma de onda |
| `list_soundcraft_catalog` | 469 comandos, os 27 plugins com cada parâmetro (id, faixa, unidade), nomes das notas de bateria, formatos |
| `run_soundcraft_commands` | Quaisquer comandos do motor mais `import_audio`, `inspect_session`, `bounce_mix`... em uma sessão (referências `$steps[N].campo`), sem interface ou ao vivo, e depois gravar as saídas |
| `open_in_soundcraft` | Abre uma sessão (ou a música de demonstração) no app SoundCraft, opcionalmente com o canal de controle |
| `get_soundcraft_status` | Plataforma, instalação, versão, comandos, plugins, cobertura do Pro Tools, app / porta de controle |

| | |
| --- | --- |
| **Lê** | WAV, AIFF, FLAC, MP3, OGG, M4A/AAC, ALAC, CAF, arquivos MIDI padrão, sessões .scraft |
| **Grava** | WAV, AIFF, FLAC (16 / 24 bits, 32 bits float), stems, MIDI, sessões .scraft (o áudio é copiado para "Audio Files") |

Os tempos são em **segundos**; as notas, em **tempos** (semínimas) desde o início do clipe. As alturas são números MIDI, nomes como `C4` / `F#3` / `Bb2` ou, para `drum_synth`, `kick`, `snare`, `clap`, `hat`, `open_hat`, `low_tom`, `mid_tom`, `high_tom`, `crash`, `ride`.

## Exemplo

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

- **SoundCraft** com `soundcraft-cli` (testado com **0.6.1**); veja [Plataformas](#plataformas)
- Node.js ≥ 20 (incluído no Claude Desktop para instalações `.mcpb`)

## Instalação

### Claude Desktop (recomendado, todas as plataformas)

1. Baixe `soundcraft-mcp-server.mcpb` da [versão mais recente](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest).
2. Dê um clique duplo (ou arraste para o Claude Desktop → *Configurações → Extensões*) e clique em **Instalar**.
3. Opcional: se o SoundCraft não estiver em um local padrão, informe a pasta dele ou o caminho do `soundcraft-cli` nas configurações da extensão.

### Sunsam Code

Instale o **SoundCraft Bridge** pelo marketplace do [Sunsam Code](https://github.com/jhonsu01/marketplace-SunsamCode), ou solte o `.mcpb` em *MCP → Instalar extensão*.

### Codex (OpenAI)

**Recomendado — o marketplace (recebe atualizações):** *Plugins → Adicionar → Adicionar marketplace*, origem `jhonsu01/craft-marketplace`, referência `main`, e instale o **SoundCraft Bridge** em **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). As novas versões chegam ao atualizar o marketplace. Ou envie o zip (o Codex o guarda na sua conta e recusa um zip mais novo com o mesmo nome):

1. Baixe `soundcraft-mcp-server-<versão>-codex.zip` da [versão mais recente](https://github.com/jhonsu01/soundcraft-mcp-server/releases/latest).
2. No Codex: *Plugins → Adicionar → Novo plugin*, escolha o zip e clique em **Adicionar plugin**.
3. O Codex inicia o servidor com `node`, então o Node.js ≥ 20 precisa estar no `PATH`. Se o SoundCraft não estiver em um local padrão, defina `SOUNDCRAFT_DIR` ou `SOUNDCRAFT_CLI` como variáveis de ambiente do sistema (o Codex não tem formulário de configuração para plugins locais).

### DeepSeek Harness

1. *Plugins → Add plugin*, digite `github:jhonsu01/craft-marketplace#path:/plugins/soundcraft-mcp-server` e clique em **Install** e depois em **Enable now**.
2. O Harness inicia o servidor com seu próprio cliente MCP e `node` (Node.js ≥ 20 no `PATH`); as ferramentas aparecem como `mcp__soundcraft__<ferramenta>` e os arquivos de saída como cartões que abrem no Harness.
3. O Harness ainda não atualiza plugins sozinho: para atualizar, desinstale o plugin e instale-o de novo com o mesmo endereço.

### Claude Code / outros clientes MCP

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

## Configuração

| Variável | Significado |
| --- | --- |
| `SOUNDCRAFT_DIR` | Pasta do SoundCraft, um de seus executáveis, a raiz de um `.tar.gz` (com `bin/`) ou `SoundCraft.app`. Padrão: detecção automática |
| `SOUNDCRAFT_CLI` | Caminho do `soundcraft-cli` / `soundcraft-cli.exe` (tem prioridade sobre `SOUNDCRAFT_DIR`) |
| `SOUNDCRAFT_APP` | Caminho do app de desktop quando ele está em outro lugar (ex.: um AppImage no Linux) |
| `SOUNDCRAFT_CONTROL_PORT` | Porta de controle do app de desktop (padrão 7801) |
| `SOUNDCRAFT_MCP_TIMEOUT` | Máximo de segundos por chamada ao motor (padrão 3600) |

## Segurança

- Os arquivos **nunca são sobrescritos** sem `overwrite: true`: em pastas é usado um nome livre (`_2`) e um `output_path` existente é um erro. As entradas são apenas lidas; um arquivo editado é salvo só como nova cópia (`_edited`).
- Todos os caminhos devem ser absolutos. O motor roda sem interface e nunca mexe no app do SoundCraft, a menos que `live: true`.
- Tudo roda localmente, sem acesso à rede. Cada tarefa usa um motor privado em uma pasta temporária que é apagada no final.

## Desenvolvimento

```bash
npm run build       # TypeScript + bundle de arquivo único (dist/bundle.cjs)
npm test            # testes unitários (lógica de caminhos de Windows, macOS e Linux)
npm run test:e2e    # 27 verificações de ponta a ponta (29 com `E2E_LIVE=1`) via MCP stdio real (áudio sintético)
npm run pack:mcpb   # soundcraft-mcp-server.mcpb
npm run pack:codex  # zip do plugin para Codex / DeepSeek Harness
```

Teste de Linux no Docker (descompacte antes `soundcraft-<versão>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/caminho/para/soundcraft-0.6.1-linux-x86_64:/opt/soundcraft:ro" -e SOUNDCRAFT_DIR=/opt/soundcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licença

Apache-2.0. O SoundCraft é © de seus autores (Storytold), MIT ou Apache-2.0.
Este projeto não é afiliado nem endossado pelo SoundCraft ou pela Storytold. Pro Tools é uma marca da Avid.
