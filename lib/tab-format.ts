/** Formato compartilhado: montador web ↔ plugin Premiere ↔ Remotion. */

export type TabInstrument = 'guitar' | 'ukulele'

export const TAB_INSTRUMENTS: Record<
  TabInstrument,
  { label: string; labels: readonly string[] }
> = {
  guitar: { label: 'Violão', labels: ['e', 'B', 'G', 'D', 'A', 'E'] },
  ukulele: { label: 'Ukulele', labels: ['A', 'E', 'C', 'G'] },
}

/** Cordas no formato padrão de tablatura (aguda → grave). Violão. */
export const TAB_STRING_LABELS = TAB_INSTRUMENTS.guitar.labels
export const TAB_STRING_COUNT = TAB_STRING_LABELS.length
export const UKE_STRING_LABELS = TAB_INSTRUMENTS.ukulele.labels

export function tabStringLabels(
  instrument: TabInstrument = 'guitar'
): readonly string[] {
  return TAB_INSTRUMENTS[instrument]?.labels ?? TAB_INSTRUMENTS.guitar.labels
}

export function tabStringCount(instrument: TabInstrument = 'guitar'): number {
  return tabStringLabels(instrument).length
}

export function resolveTabInstrument(
  instrument?: string | null,
  columns?: TabColumn[]
): TabInstrument {
  if (instrument === 'ukulele') return 'ukulele'
  if (instrument === 'guitar') return 'guitar'
  const n = columns?.[0]?.length
  return n === 4 ? 'ukulele' : 'guitar'
}

/** Por corda (aguda → grave): casa, -1 = muda, null = vazio. */
export type TabColumn = (number | null)[]

export type TabDocument = {
  version: 1
  instrument?: TabInstrument
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

export function emptyColumn(instrument: TabInstrument = 'guitar'): TabColumn {
  return Array.from({ length: tabStringCount(instrument) }, () => null)
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
  instrument?: TabInstrument
}): TabDocument {
  const instrument = resolveTabInstrument(input.instrument, input.columns)
  const n = tabStringCount(instrument)
  const columns: TabColumn[] = []
  const chords: string[] = []
  input.columns.forEach((col, i) => {
    const next = emptyColumn(instrument)
    let any = false
    for (let s = 0; s < n; s++) {
      const v = col[s]
      if (v == null || !Number.isFinite(Number(v))) continue
      next[s] = Math.trunc(Number(v))
      any = true
    }
    if (!any) return
    columns.push(next)
    chords.push(String(input.chords?.[i] || '').trim())
  })
  const doc: TabDocument = { version: 1, instrument, columns }
  const title = (input.title || '').trim()
  if (title) doc.title = title
  if (chords.some(Boolean)) doc.chords = chords
  return doc
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
    instrument: resolveTabInstrument(data.instrument, data.columns as TabColumn[]),
  })
}

/**
 * Parseia tablatura ASCII (estilo Cifra Club).
 * Violão: 6 linhas e| B| G| D| A| E|. Ukulele: 4 linhas A| E| C| G|.
 */
export function parseAsciiTab(
  text: string,
  hinted?: TabInstrument
): TabDocument {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0)

  const stringRe = /^([eEbBgGdDaA])\s*[|:]\s*(.+)$/
  type Row = { label: string; body: string }
  const rows: Row[] = []
  const other: string[] = []

  lines.forEach((line) => {
    const m = stringRe.exec(line.trim())
    if (m) rows.push({ label: m[1], body: m[2].replace(/\|/g, '') })
    else other.push(line)
  })

  const instrument = detectAsciiInstrument(rows, hinted)
  const labels = tabStringLabels(instrument)
  if (rows.length < labels.length) {
    throw new Error(
      instrument === 'ukulele'
        ? 'Cole as 4 linhas de tab (A| E| C| G|)'
        : 'Cole as 6 linhas de tab (e| B| G| D| A| E|)'
    )
  }

  const bodies = pickStringBodies(rows, labels, instrument)
  const width = Math.max(...bodies.map((b) => b.length), 1)
  const chordLine = other.length ? other[other.length - 1] : ''
  const chordTokens = extractChordRow(chordLine, width)
  const parsed = parseAsciiBodies(bodies, chordTokens, instrument)
  if (!parsed.columns.length) throw new Error('Nenhuma casa encontrada na tab')
  return toTabDocument({ ...parsed, instrument })
}

function detectAsciiInstrument(
  rows: { label: string }[],
  hinted?: TabInstrument
): TabInstrument {
  if (hinted) return hinted
  if (rows.length >= 6) return 'guitar'
  if (rows.length >= 4) return 'ukulele'
  return 'guitar'
}

function pickStringBodies(
  rows: { label: string; body: string }[],
  labels: readonly string[],
  instrument: TabInstrument
): string[] {
  const taken = new Set<number>()
  const bodies: string[] = []
  for (const want of labels) {
    let idx = -1
    if (instrument === 'guitar' && (want === 'e' || want === 'E')) {
      idx = rows.findIndex((r, i) => !taken.has(i) && (r.label === 'e' || r.label === 'E'))
    } else {
      idx = rows.findIndex(
        (r, i) => !taken.has(i) && r.label.toLowerCase() === want.toLowerCase()
      )
    }
    if (idx < 0) throw new Error(`Falta a corda ${want}`)
    taken.add(idx)
    bodies.push(rows[idx].body)
  }
  return bodies
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
  chordTokens: string[],
  instrument: TabInstrument
): { columns: TabColumn[]; chords: string[] } {
  const n = bodies.length
  const width = Math.max(...bodies.map((b) => b.length), 1)
  const skip = bodies.map(() => new Uint8Array(width))
  const columns: TabColumn[] = []
  const chords: string[] = []

  for (let x = 0; x < width; x++) {
    const col = emptyColumn(instrument)
    let any = false
    for (let s = 0; s < n; s++) {
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
        let num = Number(ch)
        const next = bodies[s][x + 1]
        if (next >= '0' && next <= '9') {
          num = num * 10 + Number(next)
          skip[s][x + 1] = 1
        }
        col[s] = num
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
