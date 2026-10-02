/**
 * Schema da timeline de shorts PlayCifras.
 *
 * Duas faixas independentes (como no vídeo real):
 * - lyricLines → quando a letra / linha de cifra muda (esquerda)
 * - chordMarks → quando o diagrama muda (direita)
 *
 * Podem avançar em tempos diferentes.
 */

export const TIMELINE_VERSION = 3 as const

/** Faixa da letra (verso / linha de cifra). */
export type ShortLyricLine = {
  t: number
  tEnd?: number
  chordLine: string
  lyric: string
  /** Acordes que aparecem nesta linha na cifra (só referência visual) */
  chords: string[]
}

/** Faixa do diagrama. */
export type ShortChordMark = {
  t: number
  tEnd?: number
  chord: string
}

/** @deprecated v2 — mantido para migração */
export type ShortTimelineEvent = ShortLyricLine & { chord?: string }

export type ShortTimeline = {
  version: typeof TIMELINE_VERSION
  slug: string
  title: string
  artist: string
  audio?: string | null
  audioStartSec?: number
  youtubeVideoId?: string | null
  durationSec: number
  width: 1080
  height: 1920
  fps: 30
  /** Quando a letra muda */
  lyricLines: ShortLyricLine[]
  /** Quando o diagrama muda */
  chordMarks: ShortChordMark[]
  diagrams?: string[]
  /**
   * @deprecated v2 — se presente sem lyricLines, migrar
   */
  events?: ShortTimelineEvent[]
}

export type ShortMeta = {
  slug: string
  outDir: string
  chordsExported: string[]
  createdAt: string
}

export function migrateTimelineToV3(raw: ShortTimeline): ShortTimeline {
  if (raw.version === 3 && raw.lyricLines?.length) {
    const base: ShortTimeline = {
      ...raw,
      version: TIMELINE_VERSION,
      chordMarks: raw.chordMarks?.length
        ? raw.chordMarks
        : expandChordMarksFromLyricLines(raw.lyricLines, raw.durationSec),
      events: undefined,
    }
    return ensureExpandedChordMarks(base)
  }

  // v1/v2 events → lyricLines; diagramas saem de chords / chord
  const events = raw.events ?? []
  const lyricLines: ShortLyricLine[] = []

  for (const ev of events) {
    const chordLine = ev.chordLine || (ev.chord ? String(ev.chord) : '')
    const chords =
      ev.chords?.length
        ? [...ev.chords]
        : ev.chord
          ? [ev.chord]
          : []

    const last = lyricLines[lyricLines.length - 1]
    const sameLine =
      last &&
      last.lyric === ev.lyric &&
      last.chordLine === chordLine
    if (!sameLine) {
      lyricLines.push({
        t: ev.t,
        tEnd: ev.tEnd,
        chordLine,
        lyric: ev.lyric ?? '',
        chords,
      })
    } else {
      if (ev.tEnd != null) last.tEnd = ev.tEnd
      for (const c of chords) {
        if (c && !last.chords.includes(c)) last.chords.push(c)
      }
    }
  }

  // Fix tEnds nas letras; diagramas sempre expandidos a partir dos acordes de cada verso
  sealTrack(lyricLines, raw.durationSec)

  return ensureExpandedChordMarks({
    ...raw,
    version: TIMELINE_VERSION,
    lyricLines,
    chordMarks: [],
    events: undefined,
  })
}

function chordMarksFromLyricLines(
  lines: ShortLyricLine[],
  durationSec: number
): ShortChordMark[] {
  return expandChordMarksFromLyricLines(lines, durationSec)
}

/**
 * Gera um mark por acorde de cada verso.
 * Se os versos ainda estão em t=0 (sync manual), diagramas também ficam em 0.
 * Se os versos já têm tempos, distribui os acordes dentro de cada verso.
 */
export function expandChordMarksFromLyricLines(
  lines: ShortLyricLine[],
  durationSec: number
): ShortChordMark[] {
  const marks: ShortChordMark[] = []
  const lyricsUnset = lines.every((l) => l.t === 0)

  if (lyricsUnset) {
    for (const line of lines) {
      for (const c of line.chords) {
        if (c) marks.push({ t: 0, chord: c })
      }
    }
  } else {
    for (const line of lines) {
      const chords = line.chords.length ? line.chords : []
      if (!chords.length) continue
      const start = line.t
      let end = line.tEnd != null && line.tEnd > start ? line.tEnd : start
      // Próximo verso com tempo maior define o fim
      for (const other of lines) {
        if (other.t > start) {
          end = other.t
          break
        }
      }
      if (end <= start) end = Math.min(durationSec, start + 0.5 * chords.length)
      const step = (end - start) / chords.length
      for (let k = 0; k < chords.length; k++) {
        marks.push({
          t: Math.round((start + k * step) * 100) / 100,
          tEnd: Math.round((start + (k + 1) * step) * 100) / 100,
          chord: chords[k],
        })
      }
    }
  }
  sealTrack(marks, durationSec)
  return marks
}

/** true se faltam diagramas (ex.: só o 1º acorde de cada verso). */
export function chordMarksNeedExpand(timeline: ShortTimeline): boolean {
  const expected = (timeline.lyricLines ?? []).reduce(
    (n, l) => n + (l.chords?.length ?? 0),
    0
  )
  if (expected === 0) return false
  return (timeline.chordMarks?.length ?? 0) < expected
}

export function ensureExpandedChordMarks(
  timeline: ShortTimeline
): ShortTimeline {
  if (!chordMarksNeedExpand(timeline)) return timeline
  return {
    ...timeline,
    version: TIMELINE_VERSION,
    chordMarks: expandChordMarksFromLyricLines(
      timeline.lyricLines,
      timeline.durationSec
    ),
  }
}

/** Atualiza tEnd: próximo item com t maior, senão durationSec. */
export function sealTrack<T extends { t: number; tEnd?: number }>(
  items: T[],
  durationSec: number
): T[] {
  for (let i = 0; i < items.length; i++) {
    let end = durationSec
    for (let j = i + 1; j < items.length; j++) {
      if (items[j].t > items[i].t) {
        end = items[j].t
        break
      }
    }
    items[i].tEnd = end
  }
  return items
}

/** Zera todos os tempos — você marca no editor. */
export function zeroTrackTimings<T extends { t: number; tEnd?: number }>(
  items: T[],
  durationSec: number
): T[] {
  const out = items.map((e) => ({ ...e, t: 0 }))
  sealTrack(out, durationSec)
  return out
}

export function validateTimeline(data: unknown): asserts data is ShortTimeline {
  if (!data || typeof data !== 'object') throw new Error('timeline inválida')
  let t = data as ShortTimeline
  if (t.version !== 3 && Array.isArray(t.events)) {
    t = migrateTimelineToV3(t)
    Object.assign(data, t)
  }
  if (t.version !== TIMELINE_VERSION) {
    throw new Error(`version esperada ${TIMELINE_VERSION}, veio ${String(t.version)}`)
  }
  if (!t.slug) throw new Error('timeline precisa de slug')
  if (!Array.isArray(t.lyricLines) || !t.lyricLines.length) {
    throw new Error('timeline precisa de lyricLines[]')
  }
  if (!Array.isArray(t.chordMarks)) {
    throw new Error('timeline precisa de chordMarks[]')
  }
  if (!(t.durationSec > 0)) throw new Error('durationSec deve ser > 0')
  for (let i = 0; i < t.lyricLines.length; i++) {
    const ev = t.lyricLines[i]
    if (typeof ev.t !== 'number' || ev.t < 0) {
      throw new Error(`lyricLines[${i}].t inválido`)
    }
    if (typeof ev.lyric !== 'string') {
      throw new Error(`lyricLines[${i}].lyric inválido`)
    }
  }
  for (let i = 0; i < t.chordMarks.length; i++) {
    const ev = t.chordMarks[i]
    if (typeof ev.t !== 'number' || ev.t < 0) {
      throw new Error(`chordMarks[${i}].t inválido`)
    }
    if (typeof ev.chord !== 'string' || !ev.chord) {
      throw new Error(`chordMarks[${i}].chord inválido`)
    }
  }
}

/**
 * Item ativo no tempo: maior `t` que ainda é <= timeSec.
 * Empate (vários em 0): fica o primeiro da lista — ideal para sync manual.
 */
export function itemAtTime<T extends { t: number; tEnd?: number }>(
  items: T[],
  timeSec: number
): { item: T; index: number } | null {
  if (!items.length) return null
  let best = 0
  let bestT = -1
  for (let i = 0; i < items.length; i++) {
    if (items[i].t <= timeSec + 1e-9 && items[i].t > bestT) {
      bestT = items[i].t
      best = i
    }
  }
  if (bestT < 0) return { item: items[0], index: 0 }
  return { item: items[best], index: best }
}

export function eventAtTime(
  events: ShortLyricLine[],
  timeSec: number
): ShortLyricLine | null {
  return itemAtTime(events, timeSec)?.item ?? null
}
