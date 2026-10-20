'use client'

import { forwardRef } from 'react'
import {
  TAB_BADGE_FILL,
  TAB_LINE,
  TAB_NOTE_PENDING,
  TAB_NOTE_PLAYED,
  TAB_STRING_COUNT,
  TAB_STRING_LABELS,
  type TabColumn,
} from '@/lib/tab-format'

export { TAB_STRING_LABELS, TAB_STRING_COUNT }
export type { TabColumn }

export type TabPreviewSvgProps = {
  title?: string
  columns: TabColumn[]
  /** Acorde acima de cada coluna. */
  chords?: string[]
  /** Intervalo de colunas para barra de compasso (0 = off). */
  barEvery?: number
  titleFontSize?: number
  titleFontFamily?: string
  noteFontSize?: number
  /**
   * Progresso 0–1 por coluna (sync preview).
   * Sem array = todas brancas; com array = interpola para roxo.
   */
  columnProgress?: number[]
  /** Fundo transparente (export vídeo) vs escuro (preview no site). */
  transparent?: boolean
  className?: string
}

const MUTE = '×'

function noteLabel(v: number | null): string {
  if (v == null) return ''
  if (v < 0) return MUTE
  return String(v)
}

function mixColor(progress: number): string {
  const p = Math.min(1, Math.max(0, progress))
  const parse = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  })
  const a = parse(TAB_NOTE_PENDING)
  const b = parse(TAB_NOTE_PLAYED)
  return `rgb(${Math.round(a.r + (b.r - a.r) * p)},${Math.round(a.g + (b.g - a.g) * p)},${Math.round(a.b + (b.b - a.b) * p)})`
}

/**
 * Tablatura estilo Cifra Club: linhas tracejadas, badges das cordas, casas em mono.
 */
const TabPreviewSvg = forwardRef<SVGSVGElement, TabPreviewSvgProps>(
  function TabPreviewSvg(
    {
      title = '',
      columns,
      chords,
      barEvery = 0,
      titleFontSize = 18,
      titleFontFamily = 'var(--font-nunito), Nunito, system-ui, sans-serif',
      noteFontSize = 16,
      columnProgress,
      transparent = false,
      className,
    },
    ref
  ) {
    const colCount = Math.max(columns.length, 1)
    const badgeR = 11
    const padLeft = badgeR * 2 + 18
    const padRight = 20
    const chordH = 22
    const titleH = title.trim() ? titleFontSize + 10 : 0
    const stringGap = 26
    const colGap = 26
    const topY = titleH + chordH + 6
    const gridH = (TAB_STRING_COUNT - 1) * stringGap
    const width = padLeft + colCount * colGap + padRight
    const height = topY + gridH + 16
    const lineStart = padLeft
    const lineEnd = width - padRight
    const mono = 'var(--font-roboto-mono), "Roboto Mono", ui-monospace, monospace'

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className={className}
        role="img"
        aria-label={title.trim() || 'Tablatura'}
      >
        {!transparent ? (
          <rect width={width} height={height} fill="#1a1a1a" rx={8} />
        ) : null}

        {title.trim() ? (
          <text
            x={width / 2}
            y={titleFontSize}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={titleFontSize}
            fontWeight="700"
            fontFamily={titleFontFamily}
          >
            {title.trim()}
          </text>
        ) : null}

        {TAB_STRING_LABELS.map((label, s) => {
          const y = topY + s * stringGap
          return (
            <g key={`str-${s}`}>
              <circle cx={badgeR + 4} cy={y} r={badgeR} fill={TAB_BADGE_FILL} />
              <text
                x={badgeR + 4}
                y={y + 4}
                textAnchor="middle"
                fill="#111"
                fontSize={11}
                fontWeight="800"
                fontFamily={mono}
              >
                {label}
              </text>
              <line
                x1={lineStart}
                y1={y}
                x2={lineEnd}
                y2={y}
                stroke={TAB_LINE}
                strokeWidth={1.4}
                strokeDasharray="5 5"
                strokeLinecap="round"
              />
            </g>
          )
        })}

        {barEvery > 0
          ? Array.from({ length: Math.floor(colCount / barEvery) }, (_, i) => {
              const afterCol = (i + 1) * barEvery
              if (afterCol >= colCount) return null
              const x = padLeft + afterCol * colGap - colGap / 2
              return (
                <line
                  key={`bar-${i}`}
                  x1={x}
                  y1={topY}
                  x2={x}
                  y2={topY + gridH}
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth={1.5}
                />
              )
            })
          : null}

        {columns.map((col, c) => {
          const x = padLeft + c * colGap + colGap / 2
          const chord = (chords?.[c] || '').trim()
          const progress = columnProgress?.[c] ?? 0
          const color = mixColor(progress)
          return (
            <g key={`col-${c}`}>
              {chord ? (
                <text
                  x={x}
                  y={titleH + chordH - 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={13}
                  fontWeight="700"
                  fontFamily={titleFontFamily}
                >
                  {chord}
                </text>
              ) : null}
              {TAB_STRING_LABELS.map((_, s) => {
                const label = noteLabel(col[s] ?? null)
                if (!label) return null
                const y = topY + s * stringGap
                const digits = label.length
                const bgW = Math.max(14, digits * 10)
                return (
                  <g key={`n-${c}-${s}`}>
                    <rect
                      x={x - bgW / 2}
                      y={y - noteFontSize / 2 - 1}
                      width={bgW}
                      height={noteFontSize + 3}
                      fill={transparent ? 'transparent' : '#1a1a1a'}
                      rx={2}
                    />
                    <text
                      x={x}
                      y={y + noteFontSize / 3}
                      textAnchor="middle"
                      fill={color}
                      fontSize={noteFontSize}
                      fontWeight="700"
                      fontFamily={mono}
                    >
                      {label}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    )
  }
)

export default TabPreviewSvg
