/**
 * Geometria extraída do SVG de referência (chordpic) — D.svg.
 * Cordas da esquerda para a direita: E A D G B e (6ª → 1ª).
 */

/** Dimensões do arquivo referência completo (400×506). */
export const CHORDPIC_VIEWBOX_FULL = { w: 400, h: 505.7863139724731 }

/**
 * Recorte horizontal em torno do braço; inclui fileira de indicadores (X / bolinhas) abaixo.
 */
export const CHORDPIC_VIEWBOX = { x: 60, w: 280, h: 502 }

/** Centro Y da fileira de estado das cordas (abaixo do braço): mudo, baixo, demais. */
export const CHORDPIC_STATUS_ROW_Y = 488

/** Raio das bolinhas da fileira inferior. */
export const CHORDPIC_STATUS_ROW_R = 12

/** Cinza dos indicadores (referência: bolinhas e X na base). */
export const CHORDPIC_STATUS_GRAY = '#9ca3af'

/** Altura de exibição típica do diagrama (px); largura deriva da proporção do viewBox. */
export const CHORDPIC_DISPLAY_H = 140

export function chordpicDisplayWidthPx(h: number = CHORDPIC_DISPLAY_H): number {
  return Math.round((CHORDPIC_VIEWBOX.w * h) / CHORDPIC_VIEWBOX.h)
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

export const CHORDPIC_FINGER_R = 15.84

/** Centro Y da célula do traste relativo 1…5 (janela do diagrama). */
export function chordpicFretCenterY(relFret: number): number | null {
  if (relFret < 1 || relFret > 5) return null
  const nut = CHORDPIC_NUT_Y
  const L = CHORDPIC_FRET_LINES
  if (relFret === 1) return (nut + L[0]) / 2
  return (L[relFret - 2] + L[relFret - 1]) / 2
}
