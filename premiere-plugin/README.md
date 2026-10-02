# PlayCifras — plugin Premiere (overlay como na referência)

Painel UXP que coloca um **overlay transparente** (letra + diagrama + marca PlayCifras) em cima do seu vídeo da guitarra — no estilo do short de referência.

## Resultado esperado

1. Seu vídeo/áudio na **V1**
2. Plugin coloca `overlay.mov` (ProRes 4444 com alpha) na **V2** no playhead
3. Exportar o short

Sem áudio no overlay — o áudio é o do seu vídeo.

## Requisitos

- Adobe Premiere **25.6+**
- UXP Developer Tool (Creative Cloud)
- `npm run dev` no PlayCifras (`http://localhost:3000`)
- Dependências Remotion em `video-shorts/` (`npm install` nessa pasta)
- Short preparado + sync L/D no editor web

## Instalação (dev)

1. Premiere → **Editar → Preferências → Plug-ins** → **Ativar modo de desenvolvedor** → reinicie.
2. UXP Developer Tool → conecte ao Premiere → **Add Plugin** → pasta `premiere-plugin/`.
3. **Load**.
4. Premiere: **Janela → Plug-ins UXP → PlayCifras**.

## Aba Diagramas (troca animada de acordes)

Card transparente (600×780, ProRes 4444 alpha, sem áudio) com o diagrama trocando no tempo da música: cada dedo desliza até a nova posição, pestana e casa base acompanham. Não precisa de short preparado — os tempos vêm dos marcadores da sua sequência.

**Modo manual (padrão)**

1. Sincronize o áudio do Studio One com o vídeo.
2. Sem clipe selecionado, toque a música e aperte **M** em cada troca de acorde (marcadores da sequência).
3. Painel → aba **Diagramas** → busque a cifra → clique no acorde onde o trecho começa.
4. **Ler marcadores** → confira a lista marcador → acorde (dá para editar ou remover linhas).
5. **Gerar animação e colocar na timeline** → o `.mov` entra na trilha escolhida, alinhado ao 1º marcador (0,6 s antes, para o card entrar).

Só contam marcadores da **cor escolhida** (padrão verde, que é a cor do `M`). Troque a cor se usa verde para outras coisas. Marcador com nome de acorde (ex.: `Am`) usa esse nome; um marcador chamado `fim` define quando o card some (sem ele: 4 s após o último).

**Modo click (BPM)**

Um único marcador no 1º tempo do primeiro acorde + BPM + tempos por acorde. A lista mostra os tempos calculados; ajuste os tempos de cada acorde quando a harmonia não for regular.

Dicas: escale/posicione o card com **Movimento** no Premiere. A trilha escolhida é sobrescrita no trecho — use uma trilha livre. Mesmos marcadores = cache (não renderiza de novo).

## Fluxo diário (Shorts)

1. Prepare e sincronize:
   ```bash
   npm run short:prepare -- <slug>
   ```
   Abra `http://localhost:3000/short-editor/<slug>` → marque **L** / **D** → Salvar.

2. (Opcional) pré-render do overlay:
   ```bash
   npm run short:overlay -- <slug>
   ```

3. No Premiere: sequência 9:16, vídeo da guitarra na timeline.

4. Painel PlayCifras → música → **Colocar overlay na timeline**.
   - 1ª vez: Remotion renderiza (pode demorar alguns minutos).
   - Próximas: usa cache se a timeline não mudou.

5. Alinhe o início do overlay ao trecho se a intro for diferente → exporte.

## Botões

| Botão | Função |
|---|---|
| **Colocar overlay na timeline** | Render/cache → importa `overlay.mov` → coloca em V2 no playhead |
| **Só peças (SRT/PNG)** | Fallback antigo (legendas + diagramas soltos no bin) |

## API

| Endpoint | Função |
|---|---|
| `GET /api/plugin/shorts` | Lista shorts |
| `POST /api/plugin/shorts/:slug/render-overlay` | Gera/cache `exports/shorts/<slug>/overlay.mov` |
| `GET /api/plugin/shorts/:slug/overlay?meta=1` | Path do overlay |
| `GET /api/plugin/shorts/:slug/package?format=json` | Pacote SRT/PNG |
| `GET /api/plugin/songs/:slug/chords` | Sequência de acordes da cifra (ordem tocada) |
| `POST /api/plugin/diagram-overlay` | `{ marks: [{t, chord}], endSec }` → `exports/diagram-overlays/<slug>-<hash>.mov` + `startSec` |

## CLI

```bash
npm run short:overlay -- <slug>
npm run short:overlay -- <slug> --force
```

## Troubleshooting

| Problema | Solução |
|---|---|
| Lista / JSON error | `npm run dev` no repo; URL ⚙ = `http://localhost:3000` |
| Render falha | `cd video-shorts && npm install`; teste `npm run short:overlay -- <slug>` |
| Overlay no bin mas não na timeline | Arraste `overlay.mov` para V2 manualmente |
| Tempos errados | Sync L/D no editor; depois `--force` no overlay |
| Sem transparência | Confirme ProRes 4444; no Premiere o alpha deve aparecer sobre V1 |

## Fora do MVP

- Sync de tempos dentro do Premiere
- Adobe Exchange
- Render na nuvem
