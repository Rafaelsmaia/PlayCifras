/**
 * Detecção de acordes no estilo cifra (colchetes e texto solto).
 * Evita falsos positivos comuns: exige limite de palavra no texto plano.
 *
 * Não usar `\b` no fim do token: `#` não é "word char", então `\b` após
 * `A/C#` ou `C#` falha (ou encurta para `A/C` / `C`) quando o próximo
 * caractere é espaço/fim de linha.
 */

/** Corpo do acorde após a tônica [A-G] (ex.: m, 7, 7M, sus4, /F). */
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
  // Extensões entre parênteses: F#m7(11), D5(6/9), A7(b9), C7(#11)
  '\\([#b+\\-]?\\d+M?(?:[/,][#b+\\-]?\\d+M?)*\\)|' +
  // 7M / 9M = maj7/maj9 (notação BR); precisa vir antes de \\d+ isolado
  '\\d+M|' +
  '\\d+' +
  ')*' +
  '(?:/[A-G](?:#|b)?)?'

/** Fim do acorde em texto plano (não continua com letra/dígito/#/b/barra). */
const CHORD_TRAIL = '(?![A-Za-z0-9#b/°+])'

const CHORD_TOKEN = new RegExp(`^[A-G]${CHORD_BODY}$`)

/** Acorde em texto solto: começa em limite de palavra, termina sem \\b após #. */
const PLAIN_CHORD_SRC = `\\b[A-G]${CHORD_BODY}${CHORD_TRAIL}`

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
  const splitRe = new RegExp(`(\\[[^\\]]+\\])|(${PLAIN_CHORD_SRC})`, 'g')

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
          variant: 'bracket',
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

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Converte o texto bruto da cifra em HTML pronto para exibição. */
export function renderCifraHtml(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  return normalized
    .split('\n')
    .map((line) =>
      parseLineSegments(line)
        .map((seg) => {
          if (seg.type === 'text') return escapeHtmlText(seg.value)
          const name = escapeHtmlText(seg.value)
          // Colchetes invisíveis preservam a largura monoespaçada (alinhamento com a letra)
          if (seg.variant === 'bracket') {
            return `<b class="cifra-chord" data-chord="${name}"><span class="cifra-chord-bracket" aria-hidden="true">[</span>${name}<span class="cifra-chord-bracket" aria-hidden="true">]</span></b>`
          }
          return `<b class="cifra-chord" data-chord="${name}">${name}</b>`
        })
        .join('')
    )
    .join('\n')
}

/** Lista única de acordes no conteúdo (colchetes + texto plano). */
export function extractUniqueChords(content: string): string[] {
  const found = new Set<string>()
  const bracketRe = /\[([^\]]+)\]/g
  let m: RegExpExecArray | null
  while ((m = bracketRe.exec(content)) !== null) {
    if (isChordToken(m[1])) found.add(m[1].trim())
  }

  const plainRe = new RegExp(PLAIN_CHORD_SRC, 'g')
  const plain = content.match(plainRe)
  if (plain) {
    for (const p of plain) {
      if (isChordToken(p)) found.add(p.trim())
    }
  }

  return Array.from(found)
}
