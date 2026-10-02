/**
 * Extrai linhas de cifra no formato visual dos Shorts PlayCifras:
 * linha de acordes (espaçada) + linha de letra, como na overlay do vídeo.
 */
import { isChordToken } from '@/lib/chord-markup'
import { alignBracketChordsToLyric } from '@/lib/cifra-align'

export type CifraDisplayLine = {
  /** Linha de acordes com espaços (alinhada à letra) */
  chordLine: string
  /** Letra da linha */
  lyric: string
  /** Acordes na ordem (para diagrama / sync) */
  chords: string[]
}

const SECTION_RE = /^\s*\[.+\]\s*$/
const TOM_RE = /^\s*Tom:/i
const TAB_RE = /^\s*[EADGBE]\|/i

function splitChordTokens(line: string): string[] {
  const bracket = Array.from(line.matchAll(/\[([^\]]+)\]/g)).map((m) =>
    m[1].trim()
  )
  if (bracket.length) return bracket.filter(isChordToken)

  return line
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && isChordToken(t))
}

function isMostlyChords(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return false
  // Linha só de [Am] [C] etc.
  if (/^\s*(\[[^\]]+\]\s*)+$/.test(line)) return true
  const chordish = tokens.filter((t) => {
    const bare = t.replace(/^\[|\]$/g, '')
    return isChordToken(bare)
  }).length
  return chordish / tokens.length >= 0.6
}

function isLyricLine(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  if (SECTION_RE.test(t) || TOM_RE.test(t) || TAB_RE.test(t)) return false
  if (isMostlyChords(t)) return false
  if (/^[\d\-xX\s|]+$/.test(t)) return false
  return /[A-Za-zÀ-ÿ]/.test(t)
}

/** Preserva ou reconstrói a linha de acordes alinhada à letra. */
function buildChordLine(rawChordLine: string, lyric: string): {
  chordLine: string
  chords: string[]
} {
  const chords = splitChordTokens(rawChordLine)
  if (!chords.length) return { chordLine: '', chords: [] }

  // Se a cifra já tem espaços razoáveis, usa a linha original (sem colchetes)
  const stripped = rawChordLine
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/\s+$/, '')
  const hasSpacing = /\S\s{2,}\S/.test(stripped) || chords.length === 1

  if (hasSpacing && stripped.trim()) {
    return { chordLine: stripped, chords }
  }

  // Reconstrói alinhamento estilo cifra
  const aligned = alignBracketChordsToLyric(chords, lyric)
    .replace(/\[/g, '')
    .replace(/\]/g, '')
  return { chordLine: aligned, chords }
}

/**
 * Pares (linha de acorde + letra) na ordem da cifra.
 */
export function extractCifraDisplayLines(content: string): CifraDisplayLine[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const out: CifraDisplayLine[] = []
  let pendingChordRaw: string | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (SECTION_RE.test(trimmed) || TOM_RE.test(trimmed)) continue
    if (TAB_RE.test(trimmed)) continue

    if (isMostlyChords(trimmed)) {
      pendingChordRaw = line.replace(/\s+$/, '')
      continue
    }

    if (isLyricLine(trimmed)) {
      if (pendingChordRaw != null) {
        const { chordLine, chords } = buildChordLine(pendingChordRaw, trimmed)
        out.push({ chordLine, lyric: trimmed, chords })
        pendingChordRaw = null
      } else {
        out.push({ chordLine: '', lyric: trimmed, chords: [] })
      }
    }
  }

  return out.filter((l) => l.lyric || l.chords.length)
}

/** Lista única de acordes na ordem de aparição. */
export function uniqueChordsFromDisplayLines(
  lines: CifraDisplayLine[]
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of lines) {
    for (const c of line.chords) {
      if (seen.has(c)) continue
      seen.add(c)
      out.push(c)
    }
  }
  return out
}

/* --- Compat: beats “achatados” (acorde a acorde) a partir das linhas --- */

export type CifraBeat = {
  chord: string
  lyric: string
  chordIndex?: number
  chordsOnLine?: number
}

export function extractCifraBeats(content: string): CifraBeat[] {
  const lines = extractCifraDisplayLines(content)
  const beats: CifraBeat[] = []
  for (const line of lines) {
    if (!line.chords.length) {
      beats.push({ chord: '', lyric: line.lyric })
      continue
    }
    for (let i = 0; i < line.chords.length; i++) {
      beats.push({
        chord: line.chords[i],
        lyric: line.lyric,
        chordIndex: i,
        chordsOnLine: line.chords.length,
      })
    }
  }
  return beats
}

/**
 * Sequência de acordes na ordem tocada (inclui intro/solos só de acordes),
 * sem repetições consecutivas — base para os marcadores do Premiere.
 */
export function extractChordSequence(content: string): string[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const out: string[] = []
  const push = (chord: string) => {
    if (out[out.length - 1] !== chord) out.push(chord)
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || TOM_RE.test(trimmed) || TAB_RE.test(trimmed)) continue

    const bracketChords = Array.from(trimmed.matchAll(/\[([^\]]+)\]/g))
      .map((m) => m[1].trim())
      .filter(isChordToken)
    if (bracketChords.length) {
      bracketChords.forEach(push)
      continue
    }

    if (isMostlyChords(trimmed)) splitChordTokens(trimmed).forEach(push)
  }
  return out
}

export function uniqueChordsFromBeats(beats: CifraBeat[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const b of beats) {
    if (!b.chord || seen.has(b.chord)) continue
    seen.add(b.chord)
    out.push(b.chord)
  }
  return out
}

export function groupBeatsByLyricLine(beats: CifraBeat[]): CifraBeat[][] {
  const groups: CifraBeat[][] = []
  for (const b of beats) {
    const last = groups[groups.length - 1]
    if (last && last[0].lyric === b.lyric && b.lyric) {
      last.push(b)
    } else {
      groups.push([b])
    }
  }
  return groups
}
