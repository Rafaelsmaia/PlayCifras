'use client'

import { useMemo, useRef, useState } from 'react'
import { Download, Eraser, Minus, Plus, RotateCcw } from 'lucide-react'
import PlayCifrasDiagramSvg, {
  type DiagramInstrument
} from '@/components/dicionario/PlayCifrasDiagramSvg'
import {
  CHORD_TITLE_FONTS,
  DEFAULT_CHORD_TITLE_FONT,
  getChordTitleFontFamily,
  type ChordTitleFontId
} from '@/components/dicionario/chord-title-fonts'
import { computeBarresFromDictionaryRow } from '@/lib/chord-dictionary-mapper'
import type { ChordPopupDiagramData } from '@/lib/chord-diagram-types'
import { downloadSvgAsPng } from '@/lib/download-svg-png'
import clsx from 'clsx'

const DISPLAY_FRETS = 4
const TITLE_SIZE_MIN = 10
const TITLE_SIZE_MAX = 28
const TITLE_SIZE_DEFAULT = 13
const TITLE_SIZE_STEP = 1

const INSTRUMENTS: Record<
  DiagramInstrument,
  { label: string; labels: readonly string[]; strings: number }
> = {
  guitar: {
    label: 'Violão',
    labels: ['E', 'A', 'D', 'G', 'B', 'e'],
    strings: 6
  },
  ukulele: {
    label: 'Ukulele',
    labels: ['G', 'C', 'E', 'A'],
    strings: 4
  }
}

type Props = {
  className?: string
}

function zeros(n: number): number[] {
  return Array.from({ length: n }, () => 0)
}

function mutes(n: number): number[] {
  return Array.from({ length: n }, () => -1)
}

function nextFinger(fingering: number[]): number {
  const used = new Set(fingering.filter((n) => n > 0))
  for (let f = 1; f <= 4; f++) {
    if (!used.has(f)) return f
  }
  return 1
}

function toDiagramData(
  frets: number[],
  fingering: number[],
  barre: boolean
): ChordPopupDiagramData {
  const barreFret = barre
    ? (() => {
        const pos = frets.filter((f) => f > 0)
        return pos.length ? Math.min(...pos) : null
      })()
    : null
  const useBarre =
    barre &&
    barreFret != null &&
    frets.filter((f) => f === barreFret).length >= 2

  return {
    frets: [...frets],
    fingering: [...fingering],
    barres: computeBarresFromDictionaryRow(
      frets,
      useBarre,
      useBarre ? barreFret : null
    )
  }
}

/**
 * Montador interativo estilo ChordPic: violão (6) ou ukulele (4) + PNG.
 * @see https://chordpic.com/pt
 */
export default function ChordBuilder({ className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [instrument, setInstrument] = useState<DiagramInstrument>('guitar')
  const [name, setName] = useState('Meu acorde')
  const [titleSize, setTitleSize] = useState(TITLE_SIZE_DEFAULT)
  const [titleFont, setTitleFont] = useState<ChordTitleFontId>(
    DEFAULT_CHORD_TITLE_FONT
  )
  const [baseFret, setBaseFret] = useState(1)
  const [frets, setFrets] = useState<number[]>(() =>
    zeros(INSTRUMENTS.guitar.strings)
  )
  const [fingering, setFingering] = useState<number[]>(() =>
    zeros(INSTRUMENTS.guitar.strings)
  )
  const [activeFinger, setActiveFinger] = useState<number | 'auto'>('auto')
  const [barre, setBarre] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const meta = INSTRUMENTS[instrument]
  const stringCount = meta.strings
  const stringLabels = meta.labels
  const stringIndices = useMemo(
    () => Array.from({ length: stringCount }, (_, i) => i),
    [stringCount]
  )

  const chordData = useMemo(
    () => toDiagramData(frets, fingering, barre),
    [frets, fingering, barre]
  )

  const canDownload = frets.some((f) => f !== -1)

  function switchInstrument(next: DiagramInstrument) {
    if (next === instrument) return
    setInstrument(next)
    const n = INSTRUMENTS[next].strings
    setFrets(zeros(n))
    setFingering(zeros(n))
    setBarre(false)
    setBaseFret(1)
  }

  function clearAll() {
    setFrets(mutes(stringCount))
    setFingering(zeros(stringCount))
    setBarre(false)
  }

  function openAll() {
    setFrets(zeros(stringCount))
    setFingering(zeros(stringCount))
    setBarre(false)
  }

  function clickFretCell(stringIndex: number, relFret: number) {
    const abs = baseFret + relFret - 1
    const wasSame = frets[stringIndex] === abs
    const nextFrets = [...frets]
    const nextFingers = [...fingering]

    if (wasSame) {
      nextFrets[stringIndex] = 0
      nextFingers[stringIndex] = 0
    } else {
      nextFrets[stringIndex] = abs
      nextFingers[stringIndex] =
        activeFinger === 'auto' ? nextFinger(nextFingers) : activeFinger
    }

    setFrets(nextFrets)
    setFingering(nextFingers)
  }

  function clickStatus(stringIndex: number) {
    const nextFrets = [...frets]
    const nextFingers = [...fingering]
    nextFrets[stringIndex] = nextFrets[stringIndex] === -1 ? 0 : -1
    nextFingers[stringIndex] = 0
    setFrets(nextFrets)
    setFingering(nextFingers)
  }

  async function handleDownload() {
    const svg = svgRef.current
    if (!svg) return
    setDownloading(true)
    try {
      const safe = (name.trim() || 'acorde').replace(/[^\w\-.#]+/g, '_')
      const prefix = instrument === 'ukulele' ? 'ukulele' : 'violao'
      await downloadSvgAsPng(svg, `playcifras-${prefix}-${safe}.png`)
    } catch (e) {
      console.error(e)
      alert('Não foi possível baixar o PNG.')
    } finally {
      setDownloading(false)
    }
  }

  const editorWidth = stringCount === 4 ? 200 : 264

  return (
    <div
      className={clsx(
        'rounded-xl border border-gray-200 bg-white p-5 shadow-sm',
        className
      )}
    >
      <div className="mb-4">
        <h2 className="font-montserrat text-lg font-bold text-gray-900">
          Montador de acordes
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Clique nas casas para posicionar os dedos e na base para × / ○ — no
          estilo{' '}
          <a
            href="https://chordpic.com/pt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cifra-green hover:underline"
          >
            ChordPic
          </a>
          , com o visual PlayCifras das cifras.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Instrumento
          <div className="flex gap-1" role="group" aria-label="Instrumento">
            {(Object.keys(INSTRUMENTS) as DiagramInstrument[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => switchInstrument(id)}
                className={clsx(
                  'rounded-md px-3 py-2 text-xs font-bold',
                  instrument === id
                    ? 'bg-cifra-green text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {INSTRUMENTS[id].label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-semibold text-gray-600">
          Nome do acorde
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 focus:border-cifra-green focus:outline-none focus:ring-2 focus:ring-cifra-green/20"
            placeholder="Ex.: Am7"
          />
        </label>
        <div className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Tamanho do título
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
        <label className="flex min-w-[140px] flex-col gap-1 text-xs font-semibold text-gray-600">
          Fonte do título
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
          Casa base
          <input
            type="number"
            min={1}
            max={15}
            value={baseFret}
            onChange={(e) => {
              const v = Math.min(15, Math.max(1, Number(e.target.value) || 1))
              setBaseFret(v)
            }}
            className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-cifra-green focus:outline-none focus:ring-2 focus:ring-cifra-green/20"
          />
        </label>
        <div className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Dedo ativo
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setActiveFinger('auto')}
              className={clsx(
                'rounded-md px-2.5 py-2 text-xs font-bold',
                activeFinger === 'auto'
                  ? 'bg-cifra-green text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              Auto
            </button>
            {[1, 2, 3, 4].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFinger(f)}
                className={clsx(
                  'h-9 w-9 rounded-md text-sm font-bold',
                  activeFinger === f
                    ? 'bg-cifra-green text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={barre}
            onChange={(e) => setBarre(e.target.checked)}
            className="accent-cifra-green"
          />
          Pestana
        </label>
      </div>

      <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center lg:gap-12">
        <div className="w-full max-w-[300px]">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
            Editor · {meta.label}
            {instrument === 'ukulele' ? ' (GCEA)' : ''}
          </p>

          <div
            className="relative mx-auto select-none"
            style={{ width: editorWidth }}
          >
            {baseFret > 1 && (
              <span className="absolute -left-1 top-[52px] text-xs font-bold text-gray-900">
                {baseFret}ª
              </span>
            )}

            <div
              className="mb-1 grid px-1"
              style={{ gridTemplateColumns: `repeat(${stringCount}, minmax(0, 1fr))` }}
            >
              {stringLabels.map((lab) => (
                <span
                  key={lab}
                  className="text-center text-[11px] font-bold text-gray-500"
                >
                  {lab}
                </span>
              ))}
            </div>

            <div
              className="relative border-t-[3px] border-gray-900"
              style={{
                borderTopWidth: baseFret <= 1 ? 3 : 1
              }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                aria-hidden
              >
                {[1, 2, 3, 4].map((f) => (
                  <div
                    key={f}
                    className="absolute left-0 right-0 border-t border-gray-900"
                    style={{ top: `${(f / DISPLAY_FRETS) * 100}%` }}
                  />
                ))}
                {stringIndices.map((s) => (
                  <div
                    key={s}
                    className="absolute top-0 bottom-0 bg-gray-900"
                    style={{
                      left:
                        stringCount === 1
                          ? '50%'
                          : `calc(${(s / (stringCount - 1)) * 100}% - 0.5px)`,
                      width: s === 0 ? 2 : 1.25
                    }}
                  />
                ))}
              </div>

              <div
                className="relative grid"
                style={{
                  gridTemplateColumns: `repeat(${stringCount}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${DISPLAY_FRETS}, 44px)`
                }}
              >
                {Array.from({ length: DISPLAY_FRETS }, (_, r) =>
                  stringIndices.map((s) => {
                    const rel = r + 1
                    const abs = baseFret + r
                    const active = frets[s] === abs
                    return (
                      <button
                        key={`${s}-${r}`}
                        type="button"
                        onClick={() => clickFretCell(s, rel)}
                        title={`${stringLabels[s]} — casa ${abs}`}
                        className="relative z-10 flex items-center justify-center hover:bg-cifra-green/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cifra-green"
                        style={{ gridColumn: s + 1, gridRow: r + 1 }}
                      >
                        {active && (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                            {fingering[s] > 0 ? fingering[s] : ''}
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div
              className="mt-2 grid"
              style={{
                gridTemplateColumns: `repeat(${stringCount}, minmax(0, 1fr))`
              }}
            >
              {stringIndices.map((s) => {
                const muted = frets[s] === -1
                return (
                  <button
                    key={`st-${s}`}
                    type="button"
                    onClick={() => clickStatus(s)}
                    title={
                      muted
                        ? `${stringLabels[s]} muda — clique para soltar`
                        : `${stringLabels[s]} — clique para mutar`
                    }
                    className="flex h-9 items-center justify-center text-gray-900 hover:bg-gray-50"
                  >
                    {muted ? (
                      <span className="text-lg font-bold leading-none">×</span>
                    ) : (
                      <span className="inline-block h-3.5 w-3.5 rounded-full border-[1.5px] border-gray-900" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={openAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Soltas
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Eraser className="h-3.5 w-3.5" />
              Limpar
            </button>
          </div>
        </div>

        <div className="flex w-full max-w-[280px] flex-col items-center">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
            Resultado
          </p>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <PlayCifrasDiagramSvg
              ref={svgRef}
              chordName={name.trim() || 'Acorde'}
              chordData={chordData}
              size="lg"
              fade
              embedTitle
              titleFontSize={titleSize}
              titleFontFamily={getChordTitleFontFamily(titleFont)}
              instrument={instrument}
            />
          </div>
          <button
            type="button"
            disabled={downloading || !canDownload}
            onClick={() => void handleDownload()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cifra-green px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Gerando…' : 'Baixar PNG'}
          </button>
        </div>
      </div>
    </div>
  )
}
