'use client'

import { useMemo, useRef, useState } from 'react'
import {
  ClipboardCopy,
  Columns,
  Download,
  Eraser,
  Minus,
  Plus,
  RotateCcw
} from 'lucide-react'
import {
  CHORD_TITLE_FONTS,
  DEFAULT_CHORD_TITLE_FONT,
  getChordTitleFontFamily,
  type ChordTitleFontId
} from '@/components/dicionario/chord-title-fonts'
import TabPreviewSvg, {
  TAB_STRING_COUNT,
  TAB_STRING_LABELS,
  type TabColumn
} from '@/components/dicionario/TabPreviewSvg'
import { parseAsciiTab, toTabDocument } from '@/lib/tab-format'
import { downloadSvgAsPng } from '@/lib/download-svg-png'
import clsx from 'clsx'

const TITLE_SIZE_MIN = 12
const TITLE_SIZE_MAX = 28
const TITLE_SIZE_DEFAULT = 16
const TITLE_SIZE_STEP = 1
const NOTE_SIZE_MIN = 11
const NOTE_SIZE_MAX = 22
const NOTE_SIZE_DEFAULT = 16
const COLS_MIN = 4
const COLS_MAX = 48
const COLS_DEFAULT = 12
const FRET_MAX = 24

type Props = {
  className?: string
}

function emptyColumn(): TabColumn {
  return Array.from({ length: TAB_STRING_COUNT }, () => null)
}

function emptyColumns(n: number): TabColumn[] {
  return Array.from({ length: n }, () => emptyColumn())
}

function cloneColumns(cols: TabColumn[]): TabColumn[] {
  return cols.map((c) => [...c])
}

/**
 * Montador de tablatura estilo Cifra Club — PNG + JSON para o plugin Premiere.
 */
export default function TabBuilder({ className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [title, setTitle] = useState('')
  const [titleSize, setTitleSize] = useState(TITLE_SIZE_DEFAULT)
  const [noteSize, setNoteSize] = useState(NOTE_SIZE_DEFAULT)
  const [titleFont, setTitleFont] = useState<ChordTitleFontId>(
    DEFAULT_CHORD_TITLE_FONT
  )
  const [columns, setColumns] = useState<TabColumn[]>(() =>
    emptyColumns(COLS_DEFAULT)
  )
  const [chords, setChords] = useState<string[]>(() =>
    Array.from({ length: COLS_DEFAULT }, () => '')
  )
  const [activeFret, setActiveFret] = useState<number | 'mute'>(0)
  const [barEvery, setBarEvery] = useState(0)
  const [selectedCol, setSelectedCol] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [asciiPaste, setAsciiPaste] = useState('')
  const [copyMsg, setCopyMsg] = useState('')
  const [previewPlayed, setPreviewPlayed] = useState(0)

  const hasNotes = useMemo(
    () => columns.some((col) => col.some((n) => n != null)),
    [columns]
  )

  const columnProgress = useMemo(() => {
    const n = columns.length
    if (n === 0) return []
    return columns.map((_, i) => {
      const edge = (previewPlayed / 100) * n
      if (i + 1 <= edge) return 1
      if (i >= edge) return 0
      return edge - i
    })
  }, [columns.length, previewPlayed])

  function syncChords(cols: TabColumn[], prev: string[]): string[] {
    return cols.map((_, i) => prev[i] ?? '')
  }

  function clickCell(colIndex: number, stringIndex: number) {
    setSelectedCol(colIndex)
    setColumns((prev) => {
      const next = cloneColumns(prev)
      const current = next[colIndex][stringIndex]
      const target = activeFret === 'mute' ? -1 : activeFret
      next[colIndex][stringIndex] = current === target ? null : target
      return next
    })
  }

  function addColumn() {
    if (columns.length >= COLS_MAX) return
    setColumns((prev) => {
      const next = cloneColumns(prev)
      const at = Math.min(selectedCol + 1, next.length)
      next.splice(at, 0, emptyColumn())
      setChords((ch) => {
        const c = [...ch]
        c.splice(at, 0, '')
        return c
      })
      return next
    })
    setSelectedCol((c) => Math.min(c + 1, COLS_MAX - 1))
  }

  function removeColumn() {
    if (columns.length <= COLS_MIN) return
    const at = Math.min(selectedCol, columns.length - 1)
    setColumns((prev) => {
      const next = cloneColumns(prev)
      next.splice(at, 1)
      return next
    })
    setChords((ch) => {
      const c = [...ch]
      c.splice(at, 1)
      return c
    })
    setSelectedCol((c) => Math.max(0, Math.min(c, columns.length - 2)))
  }

  function clearAll() {
    setColumns(emptyColumns(columns.length))
    setChords(Array.from({ length: columns.length }, () => ''))
  }

  function resetColumns() {
    setColumns(emptyColumns(COLS_DEFAULT))
    setChords(Array.from({ length: COLS_DEFAULT }, () => ''))
    setSelectedCol(0)
  }

  function clearColumn(colIndex: number) {
    setColumns((prev) => {
      const next = cloneColumns(prev)
      next[colIndex] = emptyColumn()
      return next
    })
    setChords((ch) => {
      const c = [...ch]
      c[colIndex] = ''
      return c
    })
  }

  function applyAscii() {
    try {
      const doc = parseAsciiTab(asciiPaste)
      setColumns(doc.columns)
      setChords(syncChords(doc.columns, doc.chords || []))
      if (doc.title) setTitle(doc.title)
      setSelectedCol(0)
      setCopyMsg('Tab ASCII importada.')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Tab inválida')
    }
  }

  async function copyJson() {
    const doc = toTabDocument({ title, columns, chords })
    const text = JSON.stringify(doc, null, 2)
    try {
      await navigator.clipboard.writeText(text)
      setCopyMsg('JSON copiado — cole na aba Tablatura do plugin Premiere.')
    } catch {
      prompt('Copie o JSON:', text)
    }
  }

  async function handleDownload() {
    const svg = svgRef.current
    if (!svg) return
    setDownloading(true)
    try {
      const safe = (title.trim() || 'tablatura').replace(/[^\w\-.#]+/g, '_')
      await downloadSvgAsPng(svg, `playcifras-tab-${safe}.png`)
    } catch (e) {
      console.error(e)
      alert('Não foi possível baixar o PNG.')
    } finally {
      setDownloading(false)
    }
  }

  const fretButtons: (number | 'mute')[] = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 'mute'
  ]

  return (
    <div
      className={clsx(
        'rounded-xl border border-gray-200 bg-white p-5 shadow-sm',
        className
      )}
    >
      <div className="mb-4">
        <h2 className="font-montserrat text-lg font-bold text-gray-900">
          Montador de tablaturas
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Visual no estilo Cifra Club. Monte a tab, copie o JSON e gere o overlay
          animado (casas branco → roxo) no plugin do Premiere.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs font-semibold text-gray-600">
          Título (opcional)
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 focus:border-cifra-green focus:outline-none focus:ring-2 focus:ring-cifra-green/20"
            placeholder="Ex.: Intro"
          />
        </label>
        <div className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Título
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setTitleSize((s) => Math.max(TITLE_SIZE_MIN, s - TITLE_SIZE_STEP))
              }
              disabled={titleSize <= TITLE_SIZE_MIN}
              aria-label="Diminuir título"
              className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[2.5rem] text-center text-sm font-bold tabular-nums text-gray-900">
              {titleSize}
            </span>
            <button
              type="button"
              onClick={() =>
                setTitleSize((s) => Math.min(TITLE_SIZE_MAX, s + TITLE_SIZE_STEP))
              }
              disabled={titleSize >= TITLE_SIZE_MAX}
              aria-label="Aumentar título"
              className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Casas
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setNoteSize((s) => Math.max(NOTE_SIZE_MIN, s - 1))}
              disabled={noteSize <= NOTE_SIZE_MIN}
              aria-label="Diminuir casas"
              className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[2.5rem] text-center text-sm font-bold tabular-nums text-gray-900">
              {noteSize}
            </span>
            <button
              type="button"
              onClick={() => setNoteSize((s) => Math.min(NOTE_SIZE_MAX, s + 1))}
              disabled={noteSize >= NOTE_SIZE_MAX}
              aria-label="Aumentar casas"
              className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <label className="flex min-w-[140px] flex-col gap-1 text-xs font-semibold text-gray-600">
          Fonte
          <select
            value={titleFont}
            onChange={(e) => setTitleFont(e.target.value as ChordTitleFontId)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-cifra-green focus:outline-none focus:ring-2 focus:ring-cifra-green/20"
            style={{ fontFamily: getChordTitleFontFamily(titleFont) }}
          >
            {CHORD_TITLE_FONTS.map((font) => (
              <option
                key={font.id}
                value={font.id}
                style={{ fontFamily: font.family }}
              >
                {font.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Barras
          <select
            value={barEvery}
            onChange={(e) => setBarEvery(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-cifra-green focus:outline-none focus:ring-2 focus:ring-cifra-green/20"
          >
            <option value={0}>Sem barras</option>
            <option value={2}>2 colunas</option>
            <option value={4}>4 colunas</option>
            <option value={8}>8 colunas</option>
          </select>
        </label>
      </div>

      <div className="mb-4 flex flex-col gap-1 text-xs font-semibold text-gray-600">
        Casa ativa
        <div className="flex flex-wrap gap-1">
          {fretButtons.map((f) => {
            const active = activeFret === f
            const label = f === 'mute' ? '×' : String(f)
            return (
              <button
                key={String(f)}
                type="button"
                onClick={() => setActiveFret(f)}
                className={clsx(
                  'h-9 min-w-[2.25rem] rounded-md px-2 text-sm font-bold',
                  active
                    ? 'bg-cifra-green text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {label}
              </button>
            )
          })}
          <label className="ml-1 flex items-center gap-1.5 text-xs font-semibold text-gray-600">
            Outra
            <input
              type="number"
              min={0}
              max={FRET_MAX}
              value={
                typeof activeFret === 'number' && activeFret > 12
                  ? activeFret
                  : ''
              }
              placeholder="13+"
              onChange={(e) => {
                const v = Number(e.target.value)
                if (!Number.isFinite(v)) return
                setActiveFret(Math.min(FRET_MAX, Math.max(0, Math.round(v))))
              }}
              className="w-16 rounded-lg border border-gray-200 px-2 py-2 text-sm text-gray-900 focus:border-cifra-green focus:outline-none focus:ring-2 focus:ring-cifra-green/20"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-center xl:gap-10">
        <div className="min-w-0 w-full max-w-3xl">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Editor · Violão (6 cordas)
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addColumn}
                disabled={columns.length >= COLS_MAX}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Coluna
              </button>
              <button
                type="button"
                onClick={removeColumn}
                disabled={columns.length <= COLS_MIN}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                <Minus className="h-3.5 w-3.5" />
                Coluna
              </button>
              <button
                type="button"
                onClick={() => clearColumn(selectedCol)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Columns className="h-3.5 w-3.5" />
                Limpar coluna
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Eraser className="h-3.5 w-3.5" />
                Limpar
              </button>
              <button
                type="button"
                onClick={resetColumns}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div
              className="inline-grid gap-px"
              style={{
                gridTemplateColumns: `40px repeat(${columns.length}, minmax(2.5rem, 2.75rem))`
              }}
            >
              <div className="pb-1 text-[10px] font-bold text-gray-400">Acorde</div>
              {columns.map((_, c) => (
                <input
                  key={`ch-${c}`}
                  type="text"
                  value={chords[c] || ''}
                  onFocus={() => setSelectedCol(c)}
                  onChange={(e) =>
                    setChords((prev) => {
                      const next = [...prev]
                      next[c] = e.target.value
                      return next
                    })
                  }
                  placeholder="—"
                  className={clsx(
                    'mb-1 h-7 rounded border px-1 text-center text-[11px] font-bold',
                    selectedCol === c
                      ? 'border-cifra-green bg-white text-gray-900'
                      : 'border-transparent bg-white/80 text-gray-700'
                  )}
                />
              ))}

              <div />
              {columns.map((_, c) => (
                <button
                  key={`h-${c}`}
                  type="button"
                  onClick={() => setSelectedCol(c)}
                  className={clsx(
                    'pb-1 text-center text-[10px] font-bold tabular-nums',
                    selectedCol === c ? 'text-cifra-green' : 'text-gray-400'
                  )}
                >
                  {c + 1}
                </button>
              ))}

              {TAB_STRING_LABELS.map((label, s) => (
                <div key={`row-${s}`} className="contents">
                  <span className="flex items-center justify-end pr-2 text-[11px] font-bold text-gray-500">
                    {label}
                  </span>
                  {columns.map((col, c) => {
                    const val = col[s]
                    const isBar = barEvery > 0 && c > 0 && c % barEvery === 0
                    const display =
                      val == null ? '' : val < 0 ? '×' : String(val)
                    return (
                      <button
                        key={`c-${c}-s-${s}`}
                        type="button"
                        onClick={() => clickCell(c, s)}
                        title={`${label} · coluna ${c + 1}`}
                        className={clsx(
                          'relative flex h-9 items-center justify-center rounded-sm border text-sm font-bold tabular-nums transition-colors',
                          selectedCol === c
                            ? 'border-cifra-green/40 bg-white'
                            : 'border-transparent bg-white hover:bg-cifra-green/5',
                          isBar && 'border-l-2 border-l-gray-400',
                          val != null ? 'text-gray-900' : 'text-gray-300'
                        )}
                      >
                        {display || '·'}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <label className="mt-4 flex flex-col gap-1 text-xs font-semibold text-gray-600">
            Colar tab ASCII (opcional)
            <textarea
              value={asciiPaste}
              onChange={(e) => setAsciiPaste(e.target.value)}
              rows={5}
              placeholder={`Em          D\ne|-------0-----2--|\nB|-----0-----3----|\nG|---0-----2------|\nD|-2--------------|\nA|----------------|\nE|----------------|`}
              className="rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs text-gray-900 focus:border-cifra-green focus:outline-none focus:ring-2 focus:ring-cifra-green/20"
            />
          </label>
          <button
            type="button"
            onClick={applyAscii}
            disabled={!asciiPaste.trim()}
            className="mt-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Importar ASCII
          </button>
        </div>

        <div className="flex w-full max-w-xl flex-col items-center xl:sticky xl:top-20">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
            Prévia · sync branco → roxo
          </p>
          <div className="w-full overflow-x-auto rounded-xl border border-gray-800 bg-[#1a1a1a] p-4">
            <div className="mx-auto w-fit">
              <TabPreviewSvg
                ref={svgRef}
                title={title}
                columns={columns}
                chords={chords}
                barEvery={barEvery}
                titleFontSize={titleSize}
                titleFontFamily={getChordTitleFontFamily(titleFont)}
                noteFontSize={noteSize}
                columnProgress={columnProgress}
              />
            </div>
          </div>
          <label className="mt-3 flex w-full max-w-sm flex-col gap-1 text-xs font-semibold text-gray-600">
            Simular sync ({previewPlayed}%)
            <input
              type="range"
              min={0}
              max={100}
              value={previewPlayed}
              onChange={(e) => setPreviewPlayed(Number(e.target.value))}
              className="accent-cifra-green"
            />
          </label>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={!hasNotes}
              onClick={() => void copyJson()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ClipboardCopy className="h-4 w-4" />
              Copiar JSON (Premiere)
            </button>
            <button
              type="button"
              disabled={downloading || !hasNotes}
              onClick={() => void handleDownload()}
              className="inline-flex items-center gap-2 rounded-lg bg-cifra-green px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Gerando…' : 'Baixar PNG'}
            </button>
          </div>
          {copyMsg ? (
            <p className="mt-2 text-center text-xs text-cifra-green">{copyMsg}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
