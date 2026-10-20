'use client'

import { forwardRef } from 'react'

/** Cordas no formato padrão de tablatura (aguda → grave). */
export const TAB_STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'] as const
export const TAB_STRING_COUNT = TAB_STRING_LABELS.length

export type TabColumn = (number | null)[]

export type TabPreviewSvgProps = {
  title: string
  columns: TabColumn[]
  /** Intervalo de colunas para desenhar barra de compasso (0 = desligado). */
  barEvery?: number
  titleFontSize?: number
  titleFontFamily?: string
  noteFontSize?: number
  className?: string
}

const LINE = '#222'
const MUTE = '×'

/**
 * SVG de tablatura para preview e export PNG (vídeos).
 */
const TabPreviewSvg = forwardRef<SVGSVGElement, TabPreviewSvgProps>(
  function TabPreviewSvg(
    {
      title,
      columns,
      barEvery = 0,
      titleFontSize = 16,
      titleFontFamily = 'var(--font-nunito), Nunito, system-ui, sans-serif',
      noteFontSize = 14,
      className
    },
    ref
  ) {
    const colCount = Math.max(columns.length, 1)
    const padX = 36
    const padRight = 16
    const titleH = title.trim() ? titleFontSize + 14 : 8
    const stringGap = 28
    const colGap = 28
    const topY = titleH + 8
    const gridH = (TAB_STRING_COUNT - 1) * stringGap
    const width = padX + colCount * colGap + padRight
    const height = topY + gridH + 20

    function noteLabel(v: number | null): string {
      if (v == null) return ''
      if (v < 0) return MUTE
      return String(v)
    }

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
        <rect width={width} height={height} fill="#ffffff" />

        {title.trim() ? (
          <text
            x={width / 2}
            y={titleFontSize + 2}
            textAnchor="middle"
            fill={LINE}
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
              <text
                x={padX - 10}
                y={y + 4}
                textAnchor="end"
                fill="#666"
                fontSize={11}
                fontWeight="700"
                fontFamily="var(--font-roboto-mono), 'Roboto Mono', monospace"
              >
                {label}
              </text>
              <line
                x1={padX}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke={LINE}
                strokeWidth={1.25}
              />
            </g>
          )
        })}

        {barEvery > 0
          ? Array.from(
              { length: Math.floor(colCount / barEvery) },
              (_, i) => {
                const afterCol = (i + 1) * barEvery
                if (afterCol >= colCount) return null
                const x = padX + afterCol * colGap - colGap / 2
                return (
                  <line
                    key={`bar-${i}`}
                    x1={x}
                    y1={topY}
                    x2={x}
                    y2={topY + gridH}
                    stroke={LINE}
                    strokeWidth={1.5}
                  />
                )
              }
            )
          : null}

        {columns.map((col, c) => {
          const x = padX + c * colGap + colGap / 2
          return TAB_STRING_LABELS.map((_, s) => {
            const label = noteLabel(col[s] ?? null)
            if (!label) return null
            const y = topY + s * stringGap
            const digits = label.length
            const bgW = Math.max(14, digits * 9)
            return (
              <g key={`n-${c}-${s}`}>
                <rect
                  x={x - bgW / 2}
                  y={y - noteFontSize / 2 - 1}
                  width={bgW}
                  height={noteFontSize + 4}
                  fill="#ffffff"
                  rx={2}
                />
                <text
                  x={x}
                  y={y + noteFontSize / 3}
                  textAnchor="middle"
                  fill={LINE}
                  fontSize={noteFontSize}
                  fontWeight="700"
                  fontFamily="var(--font-roboto-mono), 'Roboto Mono', monospace"
                >
                  {label}
                </text>
              </g>
            )
          })
        })}
      </svg>
    )
  }
)

export default TabPreviewSvg
