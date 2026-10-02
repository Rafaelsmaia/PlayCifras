/**
 * Monta faixas independentes: lyricLines + chordMarks.
 */
import type { CifraDisplayLine } from '../../lib/video-pipeline/extract-cifra-beats'
import type {
  ShortChordMark,
  ShortLyricLine,
} from '../../lib/video-pipeline/timeline'
import { sealTrack } from '../../lib/video-pipeline/timeline'
import type { WhisperSegment } from './align-lyrics'
import type { CifraBeat } from '../../lib/video-pipeline/extract-cifra-beats'
import { groupBeatsByLyricLine } from '../../lib/video-pipeline/extract-cifra-beats'

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenSet(s: string): Set<string> {
  return new Set(norm(s).split(' ').filter((w) => w.length > 1))
}

function overlapScore(a: string, b: string): number {
  const A = tokenSet(a)
  const B = tokenSet(b)
  if (!A.size || !B.size) return 0
  let hit = 0
  for (const t of A) if (B.has(t)) hit += 1
  return hit / Math.max(A.size, 1)
}

export type DualTracks = {
  lyricLines: ShortLyricLine[]
  chordMarks: ShortChordMark[]
}

/** Tempos zerados — o editor de sync define t/tEnd na mão. */
export function tracksFromDisplayLines(
  lines: CifraDisplayLine[],
  durationSec: number
): DualTracks {
  if (!lines.length) return { lyricLines: [], chordMarks: [] }

  const lyricLines: ShortLyricLine[] = lines.map((line) => ({
    t: 0,
    tEnd: durationSec,
    chordLine: line.chordLine,
    lyric: line.lyric,
    chords: line.chords,
  }))

  const chordMarks: ShortChordMark[] = lines.flatMap((l) =>
    (l.chords.length ? l.chords : []).map((chord) => ({
      t: 0,
      tEnd: durationSec,
      chord,
    }))
  )

  sealTrack(lyricLines, durationSec)
  sealTrack(chordMarks, durationSec)
  return { lyricLines, chordMarks }
}

/** @deprecated nome antigo */
export function eventsFromDisplayLines(
  lines: CifraDisplayLine[],
  durationSec: number
) {
  return tracksFromDisplayLines(lines, durationSec).lyricLines
}

export type MergeWhisperResult = DualTracks & {
  audioStartSec: number
}

export function mergeDisplayLinesWithWhisper(
  lines: CifraDisplayLine[],
  segments: WhisperSegment[],
  maxDurationSec: number
): MergeWhisperResult {
  if (!lines.length) {
    return { lyricLines: [], chordMarks: [], audioStartSec: 0 }
  }
  if (!segments.length) {
    return { ...tracksFromDisplayLines(lines, maxDurationSec), audioStartSec: 0 }
  }

  const lineSeg: number[] = []
  let segIdx = 0
  for (let g = 0; g < lines.length; g++) {
    const lyric = lines[g].lyric
    let best = segIdx
    let bestScore = -1
    const searchEnd = Math.min(segments.length, segIdx + 10)
    for (let s = segIdx; s < searchEnd; s++) {
      const score = lyric ? overlapScore(lyric, segments[s].text) : 0
      if (score > bestScore) {
        bestScore = score
        best = s
      }
    }
    if (!lyric || bestScore < 0.2) {
      best = Math.min(
        segments.length - 1,
        Math.max(segIdx, Math.floor((g / lines.length) * segments.length))
      )
    }
    lineSeg.push(best)
    segIdx = best
  }
  for (let i = 1; i < lineSeg.length; i++) {
    if (lineSeg[i] < lineSeg[i - 1]) lineSeg[i] = lineSeg[i - 1]
  }

  const absLines: { absT: number; absEnd: number; line: CifraDisplayLine }[] = []
  for (let g = 0; g < lines.length; g++) {
    const seg = segments[lineSeg[g]]
    const nextSeg =
      g + 1 < lines.length ? segments[lineSeg[g + 1]] : segments[lineSeg[g]]
    const lineStart = seg.t
    const lineEnd = Math.max(
      seg.tEnd,
      g + 1 < lines.length ? nextSeg.t : seg.tEnd,
      lineStart + 0.8
    )
    absLines.push({ absT: lineStart, absEnd: lineEnd, line: lines[g] })
  }

  const firstSung = absLines.find((e) => e.line.lyric.trim()) ?? absLines[0]
  const audioStartSec = Math.max(0, Math.floor(firstSung.absT * 10) / 10)

  const lyricLines: ShortLyricLine[] = []
  const chordMarks: ShortChordMark[] = []

  for (const row of absLines) {
    const t = row.absT - audioStartSec
    const tEnd = row.absEnd - audioStartSec
    if (tEnd <= 0) continue
    if (t >= maxDurationSec) break
    const lt = Math.round(Math.max(0, t) * 100) / 100
    const le = Math.round(Math.min(maxDurationSec, Math.max(lt + 0.4, tEnd)) * 100) / 100
    lyricLines.push({
      t: lt,
      tEnd: le,
      chordLine: row.line.chordLine,
      lyric: row.line.lyric,
      chords: row.line.chords,
    })

    const chords = row.line.chords.length ? row.line.chords : []
    if (chords.length) {
      const span = Math.max(0.4 * chords.length, le - lt)
      const step = span / chords.length
      for (let k = 0; k < chords.length; k++) {
        const ct = Math.round((lt + k * step) * 100) / 100
        if (ct >= maxDurationSec) break
        chordMarks.push({
          t: ct,
          tEnd: Math.round(Math.min(maxDurationSec, lt + (k + 1) * step) * 100) / 100,
          chord: chords[k],
        })
      }
    }
  }

  if (!lyricLines.length) {
    return { ...tracksFromDisplayLines(lines, maxDurationSec), audioStartSec: 0 }
  }
  sealTrack(lyricLines, maxDurationSec)
  sealTrack(chordMarks, maxDurationSec)
  return { lyricLines, chordMarks, audioStartSec }
}

export function mergeBeatsWithWhisper(
  beats: CifraBeat[],
  segments: WhisperSegment[],
  maxEvents: number,
  maxDurationSec = 45
): MergeWhisperResult {
  const groups = groupBeatsByLyricLine(beats.slice(0, maxEvents))
  const lines: CifraDisplayLine[] = groups.map((g) => ({
    lyric: g[0].lyric,
    chords: g.map((b) => b.chord).filter(Boolean),
    chordLine: g
      .map((b) => b.chord)
      .filter(Boolean)
      .join('  '),
  }))
  return mergeDisplayLinesWithWhisper(lines, segments, maxDurationSec)
}

export function uniformEvents(beats: CifraBeat[], durationSec: number) {
  const groups = groupBeatsByLyricLine(beats)
  const lines: CifraDisplayLine[] = groups.map((g) => ({
    lyric: g[0].lyric,
    chords: g.map((b) => b.chord).filter(Boolean),
    chordLine: g
      .map((b) => b.chord)
      .filter(Boolean)
      .join('  '),
  }))
  return tracksFromDisplayLines(lines, durationSec).lyricLines
}
