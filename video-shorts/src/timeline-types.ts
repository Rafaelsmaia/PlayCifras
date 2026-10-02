export type ShortLyricLine = {
  t: number
  tEnd?: number
  chordLine: string
  lyric: string
  chords: string[]
}

export type ShortChordMark = {
  t: number
  tEnd?: number
  chord: string
}

export type ShortTimeline = {
  version: number
  slug: string
  title: string
  artist: string
  durationSec: number
  fps: number
  width: number
  height: number
  lyricLines?: ShortLyricLine[]
  chordMarks?: ShortChordMark[]
  /** @deprecated v2 */
  events?: Array<ShortLyricLine & { chord?: string }>
  diagrams?: string[]
  audio?: string | null
  audioStartSec?: number
}
