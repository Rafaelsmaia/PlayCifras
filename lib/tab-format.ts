/** Formato compartilhado: montador web ↔ plugin Premiere ↔ Remotion. */

export const TAB_STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'] as const
export const TAB_STRING_COUNT = TAB_STRING_LABELS.length

/** Por corda (e → E): casa, -1 = muda, null = vazio. */
export type TabColumn = (number | null)[]

export type TabDocument = {
  version: 1
  title?: string
  /** Nome do acorde acima de cada coluna (ou '' ). */
  chords?: string[]
  columns: TabColumn[]
}

export type TabColumnMark = {
  /** Segundos absolutos na sequência do Premiere. */
  t: number
  col: number
}

/** Cor das casas ainda não tocadas / já tocadas (overlay de vídeo). */
export const TAB_NOTE_PENDING = '#ffffff'
export const TAB_NOTE_PLAYED = '#f33aff'
/** Badge das cordas (estilo Cifra Club). */
export const TAB_BADGE_FILL = '#f33aff'
export const TAB_LINE = 'rgba(255,255,255,0.85)'

export function emptyColumn(): TabColumn {
  return Array.from({ length: TAB_STRING_COUNT }, () => null)
}

export function columnHasNotes(col: TabColumn): boolean {
  return col.some((n) => n != null)
}

export function soundingColumnIndexes(columns: TabColumn[]): number[] {
  const out: number[] = []
  columns.forEach((col, i) => {
    if (columnHasNotes(col)) out.push(i)
  })
  return out
}

export function toTabDocument(input: {
  title?: string
  columns: TabColumn[]
  chords?: string[]
}): TabDocument {
  return {
    version: 1,
    title: (input.title || '').trim() || undefined,
    chords: input.chords?.map((c) => String(c || '').trim()),
    columns: input.columns.map((col) => {
      const next = emptyColumn()
      for (let s = 0; s < TAB_STRING_COUNT; s++) {
        const v = col[s]
        next[s] = v == null || !Number.isFinite(Number(v)) ? null : Math.trunc(Number(v))
      }
      return next
    }),
  }
}

export function parseTabJson(raw: string): TabDocument {
  const data = JSON.parse(raw) as Partial<TabDocument>
  if (!data || !Array.isArray(data.columns) || !data.columns.length) {
    throw new Error('JSON sem colunas de tablatura')
  }
  return toTabDocument({
    title: data.title,
    columns: data.columns as TabColumn[],
    chords: data.chords,
  })
}

/**
 * Parseia tablatura ASCII (estilo Cifra Club).
 * Aceita linha opcional de acordes acima e 6 linhas e| B| G| D| A| E|.
 */
export function parseAsciiTab(text: string): TabDocument {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0)

  const stringRe = /^([eEbBgGdDaA])\s*[|:]\s*(.+)$/
  type Row = { label: string; body: string; order: number }
  const rows: Row[] = []
  const other: string[] = []

  lines.forEach((line, order) => {
    const m = stringRe.exec(line.trim())
    if (m) rows.push({ label: m[1], body: m[2].replace(/\|/g, ''), order })
    else other.push(line)
  })

  if (rows.length < 6) {
    throw new Error('Cole as 6 linhas de tab (e| B| G| D| A| E|)')
  }

  // Duas cordas "E": a primeira no arquivo é a aguda (e), a última a grave (E).
  const bodies: string[] = []
  const taken = new Set<number>()
  for (const want of TAB_STRING_LABELS) {
    let idx = -1
    if (want === 'e') {
      idx = rows.findIndex((r, i) => !taken.has(i) && (r.label === 'e' || r.label === 'E'))
    } else if (want === 'E') {
      idx = rows.findIndex((r, i) => !taken.has(i) && (r.label === 'E' || r.label === 'e'))
    } else {
      idx = rows.findIndex(
        (r, i) => !taken.has(i) && r.label.toLowerCase() === want.toLowerCase()
      )
    }
    if (idx < 0) throw new Error(`Falta a corda ${want}`)
    taken.add(idx)
    bodies.push(rows[idx].body)
  }

  const width = Math.max(...bodies.map((b) => b.length), 1)
  const chordLine = other.length ? other[other.length - 1] : ''
  const chordTokens = extractChordRow(chordLine, width)
  const parsed = parseAsciiBodies(bodies, chordTokens)
  if (!parsed.columns.length) throw new Error('Nenhuma casa encontrada na tab')
  return toTabDocument(parsed)
}

function extractChordRow(line: string, width: number): string[] {
  const out = Array.from({ length: width }, () => '')
  if (!line || !/[A-G]/.test(line)) return out
  const re =
    /[A-G](?:#|b)?(?:maj|min|dim|aug|sus|add|m|M)?\d*(?:\/[A-G](?:#|b)?)?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    const at = Math.min(width - 1, Math.max(0, m.index))
    out[at] = m[0]
  }
  return out
}

function parseAsciiBodies(
  bodies: string[],
  chordTokens: string[]
): { columns: TabColumn[]; chords: string[] } {
  const width = Math.max(...bodies.map((b) => b.length), 1)
  const skip = bodies.map(() => new Uint8Array(width))
  const columns: TabColumn[] = []
  const chords: string[] = []

  for (let x = 0; x < width; x++) {
    const col = emptyColumn()
    let any = false
    for (let s = 0; s < TAB_STRING_COUNT; s++) {
      if (skip[s][x]) continue
      const ch = bodies[s][x] || '-'
      if (ch === '-' || ch === ' ' || ch === '|' || ch === '/' || ch === 'h' || ch === 'p') {
        continue
      }
      if (ch === 'x' || ch === 'X') {
        col[s] = -1
        any = true
        continue
      }
      if (ch >= '0' && ch <= '9') {
        let n = Number(ch)
        const next = bodies[s][x + 1]
        if (next >= '0' && next <= '9') {
          n = n * 10 + Number(next)
          skip[s][x + 1] = 1
        }
        col[s] = n
        any = true
      }
    }
    if (!any) continue
    columns.push(col)
    chords.push(chordTokens[x] || '')
  }
  return { columns, chords }
}

/** Interpola branco → roxo conforme o progresso 0–1. */
export function lerpTabNoteColor(progress: number): string {
  const p = Math.min(1, Math.max(0, progress))
  const a = hexToRgb(TAB_NOTE_PENDING)
  const b = hexToRgb(TAB_NOTE_PLAYED)
  const r = Math.round(a.r + (b.r - a.r) * p)
  const g = Math.round(a.g + (b.g - a.g) * p)
  const bl = Math.round(a.b + (b.b - a.b) * p)
  return `rgb(${r},${g},${bl})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}
