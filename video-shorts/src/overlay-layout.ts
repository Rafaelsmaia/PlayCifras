/** Posições dos overlays no quadro, tiradas dos vídeos PlayCifras (9:16). */
export const DEFAULT_FRAME = { width: 1080, height: 1920 }

export const OVERLAY_INK = '#ffffff'
export const LYRIC_CHORD_COLOR = '#f33aff'

export const LAYOUT = {
  /** Centro horizontal do diagrama (fração da largura). */
  diagramCenterX: 0.77,
  /** Topo da grade do diagrama (fração da altura). */
  diagramGridTop: 0.42,
  /** Centro do bloco da letra. */
  lyricsCenterX: 0.35,
  lyricsCenterY: 0.47,
  /** Largura máxima da letra antes de encolher a fonte. */
  lyricsMaxWidth: 0.6,
}

export function frameOf(p: { width?: number; height?: number }) {
  const width = p.width || DEFAULT_FRAME.width
  const height = p.height || DEFAULT_FRAME.height
  return { width, height, u: Math.min(width, height) / DEFAULT_FRAME.width }
}
