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
  /** Acordes sem digitação na biblioteca ficam fora (só o nome aparece). */
  shapes: Record<string, DiagramShape>
  durationSec: number
  fps: number
  /** Tamanho da sequência do Premiere; o diagrama já sai na posição do vídeo. */
  width?: number
  height?: number
}

export type LyricChord = { chord: string; at: number }

export type LyricOverlayLine = { text: string; chords: LyricChord[] }

export type LyricScreen = {
  /** Segundos desde o início do overlay. */
  t: number
  /** Vazio = tela limpa (pausa instrumental). */
  lines: LyricOverlayLine[]
}

export type LyricsOverlayProps = {
  screens: LyricScreen[]
  durationSec: number
  fps: number
  width?: number
  height?: number
}

export type RhythmStroke = 'down' | 'up'

/** Imagem estática: rótulo ("Ritmo:") e setas da batida. */
export type RhythmOverlayProps = {
  strokes: RhythmStroke[]
  label: string
  /** Centro vertical do bloco (fração da altura). */
  centerY?: number
  width?: number
  height?: number
}
