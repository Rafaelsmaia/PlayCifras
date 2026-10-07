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

Overlay transparente (ProRes 4444 alpha, sem áudio, do tamanho da sequência) com o diagrama no desenho do gerador do site — branco, cordas em degradê embaixo, número do dedo vazado — trocando no tempo da música: cada dedo desliza até a nova posição, pestana e casa base acompanham. Já sai à direita, na posição dos vídeos PlayCifras. Não precisa de short preparado — os tempos vêm dos marcadores da sua sequência.

**Não precisa de `npm run dev`.** Cifras e digitações vêm do site no ar; o vídeo é renderizado pelo **ajudante de render**, um processo invisível que abre com o Windows.

**Instalar o ajudante (uma vez por PC, precisa do Node.js):**

```powershell
npm run helper:install
```

Copia `video-shorts/` para `%LOCALAPPDATA%\PlayCifras\render-helper`, instala as dependências e registra na Inicialização do Windows. Rode de novo para atualizar depois de um `git pull`. Vídeos gerados ficam em `Documentos\PlayCifras\Overlays`; log em `%LOCALAPPDATA%\PlayCifras\render-helper\helper\helper.log`. Para remover: `npm run helper:uninstall`.

**Modo manual (padrão)**

1. Sincronize o áudio do Studio One com o vídeo.
2. Sem clipe selecionado, toque a música e aperte **M** em cada troca de acorde (marcadores da sequência).
3. Painel → aba **Diagramas** → busque a cifra → clique no acorde onde o trecho começa.
4. **Ler marcadores** → confira a lista marcador → acorde (dá para editar ou remover linhas).
5. **Gerar animação e colocar na timeline** → o `.mov` entra na trilha escolhida, alinhado ao 1º marcador (0,6 s antes, para o card entrar).

Só contam marcadores da **cor escolhida** (padrão verde, que é a cor do `M`). Troque a cor se usa verde para outras coisas. Marcador com nome de acorde (ex.: `Am`) usa esse nome; um marcador chamado `fim` define quando o card some (sem ele: 4 s após o último).

**Versões da música**

Se a música tiver mais de uma cifra no site (ex.: `Aquieta Minh'alma` e `Aquieta Minh'alma (Simplificada)`), aparece o campo **Versão** abaixo da música escolhida — vale para as abas Diagramas e Letra. Versões são cifras do mesmo artista com o mesmo título e um sufixo entre parênteses; sem sufixo é a **Principal**.

**Sequência livre**

Em **Acordes de → Sequência livre**, digite os acordes separados por espaço (ex.: `A9 E F#m11/C# D9`) em vez de buscar uma cifra. Com **Repetir a sequência** marcado, ela volta ao início quando acaba — útil para progressões que se repetem. O painel avisa na hora quais acordes não têm diagrama na biblioteca.

**Modo click (BPM)**

Um único marcador no 1º tempo do primeiro acorde + BPM + tempos por acorde. A lista mostra os tempos calculados; ajuste os tempos de cada acorde quando a harmonia não for regular.

Dicas: para mudar a posição, use **Movimento** no Premiere. A trilha escolhida é sobrescrita no trecho — use uma trilha livre. Mesmos marcadores = cache (não renderiza de novo).

## Aba Letra (letra com cifras)

Overlay transparente com a letra em telas de 1–3 linhas, acordes em magenta sobre a sílaba (fonte Proxima Soft), à esquerda do diagrama. Usa a mesma cifra buscada no topo do painel e marcadores de **outra cor** (padrão azul), porque a letra e os acordes nem sempre trocam juntos.

1. Uma vez: **Editar › Atalhos do teclado**, busque "marcador" e dê uma tecla a **Adicionar marcador azul**.
2. Toque a música e aperte essa tecla em cada troca de tela da letra.
3. Aba **Letra** → clique na linha onde o trecho começa → **Ler marcadores**.
4. Na lista, `−`/`+` mudam quantas linhas cada tela pega (as seguintes se ajustam); `×` remove o marcador.
5. **Gerar letra e colocar na timeline** (padrão V3, acima dos diagramas).

Marcador chamado `pausa` limpa a tela (trecho instrumental); `fim` define quando a letra some. **Quebrar linhas longas** divide linhas com mais de 28 caracteres em duas, que ficam sempre na mesma tela.

## Aba Ritmo (setas da batida)

Imagem estática transparente (PNG) com "Ritmo:" e as setas — para baixo em branco, para cima em magenta — centralizada na parte de baixo do vídeo.

1. Monte o ritmo com **↓ Para baixo** / **↑ Para cima** (até 16 setas). Clique numa seta da prévia para inverter; **Apagar última** / **Limpar** corrigem.
2. Ajuste o **Texto** (padrão `Ritmo:`; vazio = só as setas) e a **Altura no vídeo** (centro do bloco, % da altura; padrão 80).
3. Posicione a agulha onde o ritmo deve aparecer e clique em **Gerar ritmo e colocar na agulha** (padrão V4).

Sem **Duração**, a imagem vai até o fim da sequência. Se o Premiere não aceitar a duração pela API, o painel avisa — é só arrastar a borda do clipe.

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
| `GET /api/plugin/songs/:slug/chords` | Sequência de acordes da cifra (ordem tocada) + `lines` (letra com `{chord, at}` por sílaba) + `versions` (`[{slug, key, label}]`) |
| `POST /api/plugin/chord-shapes` | `{ chords }` → digitações prontas para a composição (usado pelo ajudante) |
| Ajudante `POST http://127.0.0.1:3917/render-diagrams` | `{ marks: [{t, chord}], endSec, siteUrl, width, height }` → `.mov` + `startSec` |
| Ajudante `POST http://127.0.0.1:3917/render-lyrics` | `{ screens: [{t, lines}], endSec, width, height }` → `.mov` + `startSec` |
| Ajudante `POST http://127.0.0.1:3917/render-rhythm` | `{ strokes: ['down'\|'up'], label, centerY, width, height }` → `.png` transparente |

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
