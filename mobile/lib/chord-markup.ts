/**
 * Parser de acordes — espelho de packages/cifra-core (MVP).
 * Manter sincronizado com lib/chord-markup.ts do site.
 */

const CHORD_BODY =
  '(?:#|b)?' +
  '(?:' +
  'm(?:aj|in)?|' +
  'dim|' +
  'aug|' +
  'sus(?:2|4)?|' +
  'add(?:9|11)?|' +
  'maj(?:7|9|11)?|' +
  'm\\d*|' +
  '\\+|' +
  '°|' +
  '\\([#b+\\-]?\\d+M?(?:[/,][#b+\\-]?\\d+M?)*\\)|' +
  '\\d+M|' +
  '\\d+' +
  ')*' +
  '(?:/[A-G](?:#|b)?)?'

const CHORD_TRAIL = '(?![A-Za-z0-9#b/°+])'
const CHORD_TOKEN = new RegExp(`^[A-G]${CHORD_BODY}$`)
const PLAIN_CHORD_SRC = `\\b[A-G]${CHORD_BODY}${CHORD_TRAIL}`

export function isChordToken(s: string): boolean {
  return CHORD_TOKEN.test(s.trim())
}

export type LineSegment =
  | { type: 'text'; value: string }
  | { type: 'chord'; value: string; variant: 'plain' | 'bracket' }

export function parseLineSegments(line: string): LineSegment[] {
  const splitRe = new RegExp(`(\\[[^\\]]+\\])|(${PLAIN_CHORD_SRC})`, 'g')
  const raw = line.split(splitRe)
  const out: LineSegment[] = []

  for (const part of raw) {
    if (part === undefined || part === '') continue

    if (part.startsWith('[') && part.endsWith(']')) {
      const inner = part.slice(1, -1)
      if (isChordToken(inner)) {
        out.push({ type: 'chord', value: inner.trim(), variant: 'bracket' })
      } else {
        out.push({ type: 'text', value: part })
      }
      continue
    }

    if (isChordToken(part)) {
      out.push({ type: 'chord', value: part.trim(), variant: 'plain' })
    } else {
      out.push({ type: 'text', value: part })
    }
  }

  return out
}

export function parseCifraContent(content: string): LineSegment[][] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return normalized.split('\n').map((line) => parseLineSegments(line))
}
