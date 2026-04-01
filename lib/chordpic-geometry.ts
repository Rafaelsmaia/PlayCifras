/**
 * Geometria extraída do SVG de referência (chordpic) — D.svg.
 * Cordas da esquerda para a direita: E A D G B e (6ª → 1ª).
 */

/** Dimensões do arquivo referência completo (400×506). */
export const CHORDPIC_VIEWBOX_FULL = { w: 400, h: 505.7863139724731 }

export const CHORDPIC_VIEWBOX_H = 502

/**
 * Sem indicador de casa base: recorte clássico chordpic (x+w=340), grade ~centrada na moldura.
 */
export const CHORDPIC_VIEWBOX_CENTERED = {
  x: 60,
  w: 280,
  h: CHORDPIC_VIEWBOX_H
} as const

/**
 * Com "5ª" / "12ª": margem esquerda extra (x negativo); x+w segue 340.
 */
export const CHORDPIC_VIEWBOX_WITH_LABEL = {
  x: -20,
  w: 360,
  h: CHORDPIC_VIEWBOX_H
} as const

export function chordpicViewBox(baseFret: number) {
  return baseFret > 1 ? CHORDPIC_VIEWBOX_WITH_LABEL : CHORDPIC_VIEWBOX_CENTERED
}

/** Centro Y da fileira de estado das cordas (abaixo do braço): mudo, baixo, demais. */
export const CHORDPIC_STATUS_ROW_Y = 488

/** Raio das bolinhas da fileira inferior. */
export const CHORDPIC_STATUS_ROW_R = 14

/** Cinza dos indicadores (referência: bolinhas e X na base). */
export const CHORDPIC_STATUS_GRAY = '#9ca3af'

/** Altura de exibição típica do diagrama (px); largura deriva da proporção do viewBox. */
export const CHORDPIC_DISPLAY_H = 168

export function chordpicDisplayWidthPx(
  h: number = CHORDPIC_DISPLAY_H,
  viewBoxW: number = CHORDPIC_VIEWBOX_WITH_LABEL.w
): number {
  return Math.round((viewBoxW * h) / CHORDPIC_VIEWBOX_H)
}

/** Centro X de cada corda (índice 0 = Mi grave). */
export const CHORDPIC_STRING_X = [80, 128, 176, 224, 272, 320] as const

export const CHORDPIC_NUT_Y = 108.98420810699463

/** Linhas horizontais dos trastes (abaixo do nut). */
export const CHORDPIC_FRET_LINES = [
  183.58420810699462,
  253.18420810699462,
  322.7842081069946,
  392.3842081069946,
  461.98420810699463
] as const

export const CHORDPIC_STRING_TOP = 113.98420810699463
export const CHORDPIC_STRING_BOTTOM = 464.23420810699463

/** Bolinhas de dedilhado no braço (raio em unidades do viewBox). */
export const CHORDPIC_FINGER_R = 22

/** Número do dedo dentro da bolinha — proporcional ao raio para leitura ao escalar o SVG. */
export const CHORDPIC_FINGER_FONT_SIZE = 24

/** Nome do acorde acima do diagrama (ex.: "A5"); escala com o viewBox. */
export const CHORDPIC_CHORD_TITLE_FONT_SIZE = 48

/** Deslocamento vertical do título (referência chordpic 37px / dy 48.1, reproporcionado). */
export const CHORDPIC_CHORD_TITLE_TSPAN_DY = 62.4

/**
 * Indicador à esquerda quando o diagrama não começa no nut (ex.: "5ª").
 * Propositalmente maior que CHORDPIC_FINGER_FONT_SIZE — é o título da região do braço, não dedo.
 */
export const CHORDPIC_BASE_FRET_FONT_SIZE = 42

/** Alinhamento horizontal do rótulo "5ª": encosta à esquerda da bolinha da 6ª corda (sem sobreposição). */
export const CHORDPIC_BASE_FRET_LABEL_X =
  CHORDPIC_STRING_X[0] - CHORDPIC_FINGER_R - 4

/** Centro Y da célula do traste relativo 1…5 (janela do diagrama). */
export function chordpicFretCenterY(relFret: number): number | null {
  if (relFret < 1 || relFret > 5) return null
  const nut = CHORDPIC_NUT_Y
  const L = CHORDPIC_FRET_LINES
  if (relFret === 1) return (nut + L[0]) / 2
  return (L[relFret - 2] + L[relFret - 1]) / 2
}
