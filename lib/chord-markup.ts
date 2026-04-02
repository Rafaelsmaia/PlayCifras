/**
 * Detecção de acordes no estilo cifra (colchetes e texto solto).
 * Evita falsos positivos comuns: exige limite de palavra no texto plano.
 */

/** Corpo do acorde após a tônica [A-G] (ex.: m, 7, sus4, /F). */
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
  '\\d+' +
  ')*' +
  '(?:/[A-G](?:#|b)?)?'

const CHORD_TOKEN = new RegExp(`^[A-G]${CHORD_BODY}$`)

export function isChordToken(s: string): boolean {
  return CHORD_TOKEN.test(s.trim())
}

/** Segmento de linha: texto cru preserva espaços; acorde em colchetes mantém largura `[Am]`. */
export type LineSegment =
  | { type: 'text'; value: string }
  | { type: 'chord'; value: string; variant: 'plain' }
  | { type: 'chord'; value: string; variant: 'bracket' }

/** Divide uma linha em texto e acordes (entre colchetes ou texto plano). Não altera espaços. */
export function parseLineSegments(line: string): LineSegment[] {
  const splitRe = new RegExp(
    '(\\[[^\\]]+\\])|(\\b[A-G]' + CHORD_BODY + '\\b)',
    'g'
  )

  const raw = line.split(splitRe)
  const out: LineSegment[] = []

  for (const part of raw) {
    if (part === undefined || part === '') continue

    if (part.startsWith('[') && part.endsWith(']')) {
      const inner = part.slice(1, -1)
      if (isChordToken(inner)) {
        out.push({
          type: 'chord',
          value: inner.trim(),
          variant: 'bracket'
        })
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

/** Lista única de acordes no conteúdo (colchetes + texto plano). */
export function extractUniqueChords(content: string): string[] {
  const found = new Set<string>()
  const bracketRe = /\[([^\]]+)\]/g
  let m: RegExpExecArray | null
  while ((m = bracketRe.exec(content)) !== null) {
    if (isChordToken(m[1])) found.add(m[1].trim())
  }

  const plainRe = new RegExp(`\\b[A-G]${CHORD_BODY}\\b`, 'g')
  const plain = content.match(plainRe)
  if (plain) {
    for (const p of plain) {
      if (isChordToken(p)) found.add(p.trim())
    }
  }

  return Array.from(found)
}
