/** Acorde já normalizado para desenho (janela de 4 casas a partir de `baseFret`). */
export type DiagramShape = {
  /** Por corda (E grave → e aguda): -1 abafada, 0 solta, 1–4 casa relativa. */
  frets: number[]
  fingers: number[]
  baseFret: number
  barres: Array<{ rel: number; fromCol: number; toCol: number }>
}

export type DiagramMark = {
  /** Segundos desde o início do overlay. */
  t: number
  chord: string
}

export type DiagramOverlayProps = {
  marks: DiagramMark[]
  /** Acordes sem digitação na biblioteca ficam fora (card mostra só o nome). */
  shapes: Record<string, DiagramShape>
  durationSec: number
  fps: number
}
