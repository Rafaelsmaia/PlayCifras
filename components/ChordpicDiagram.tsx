'use client'

import {
  CHORDPIC_FINGER_R,
  CHORDPIC_FRET_LINES,
  CHORDPIC_NUT_Y,
  CHORDPIC_STRING_BOTTOM,
  CHORDPIC_STRING_TOP,
  CHORDPIC_STRING_X,
  CHORDPIC_DISPLAY_H,
  CHORDPIC_STATUS_GRAY,
  CHORDPIC_STATUS_ROW_R,
  CHORDPIC_STATUS_ROW_Y,
  CHORDPIC_VIEWBOX,
  chordpicDisplayWidthPx,
  chordpicFretCenterY
} from '@/lib/chordpic-geometry'

type BarreMeta = {
  fromString: number
  toString: number
  fret: number
}

interface ChordpicDiagramProps {
  chordName: string
  relFrets: number[]
  fingers: number[]
  baseFret: number
  barresFromDictionary?: BarreMeta[]
  /** Trastes relativos onde há pestana (fallback se não houver `barresFromDictionary`). */
  relBarreValues?: number[]
}

/** X cinza na fileira inferior (corda não tocada). */
function statusMuteX(cx: number, cy: number) {
  const d = 10
  return (
    <g>
      <line
        x1={cx - d}
        y1={cy - d}
        x2={cx + d}
        y2={cy + d}
        strokeWidth={3}
        stroke={CHORDPIC_STATUS_GRAY}
      />
      <line
        x1={cx - d}
        y1={cy + d}
        x2={cx + d}
        y2={cy - d}
        strokeWidth={3}
        stroke={CHORDPIC_STATUS_GRAY}
      />
    </g>
  )
}

function stringNumToCol(s: number): number {
  return 6 - s
}

function buildBarreRects(
  relFrets: number[],
  baseFret: number,
  barresFromDictionary: BarreMeta[] | undefined,
  relBarreValues: number[] | undefined
): Array<{ rel: number; x1: number; x2: number; cy: number }> {
  const out: Array<{ rel: number; x1: number; x2: number; cy: number }> = []

  if (barresFromDictionary?.length) {
    for (const b of barresFromDictionary) {
      const rel = b.fret - baseFret + 1
      const cy = chordpicFretCenterY(rel)
      if (cy == null || rel < 1 || rel > 5) continue
      const c0 = stringNumToCol(Math.max(b.fromString, b.toString))
      const c1 = stringNumToCol(Math.min(b.fromString, b.toString))
      const xLeft = CHORDPIC_STRING_X[c0]
      const xRight = CHORDPIC_STRING_X[c1]
      out.push({
        rel,
        x1: xLeft - CHORDPIC_FINGER_R,
        x2: xRight + CHORDPIC_FINGER_R,
        cy
      })
    }
    return out
  }

  for (const br of relBarreValues ?? []) {
    const cols: number[] = []
    relFrets.forEach((f, i) => {
      if (f === br) cols.push(i)
    })
    if (cols.length < 2) continue
    const cy = chordpicFretCenterY(br)
    if (cy == null) continue
    const c0 = Math.min(...cols)
    const c1 = Math.max(...cols)
    out.push({
      rel: br,
      x1: CHORDPIC_STRING_X[c0] - CHORDPIC_FINGER_R,
      x2: CHORDPIC_STRING_X[c1] + CHORDPIC_FINGER_R,
      cy
    })
  }
  return out
}

function isCoveredByBarre(
  col: number,
  rel: number,
  barreRects: Array<{ rel: number; x1: number; x2: number }>
): boolean {
  const x = CHORDPIC_STRING_X[col]
  for (const r of barreRects) {
    if (r.rel !== rel) continue
    if (x >= r.x1 && x <= r.x2) return true
  }
  return false
}

export default function ChordpicDiagram({
  chordName,
  relFrets,
  fingers,
  baseFret,
  barresFromDictionary,
  relBarreValues
}: ChordpicDiagramProps) {
  const barreRects = buildBarreRects(
    relFrets,
    baseFret,
    barresFromDictionary,
    relBarreValues
  )

  /** Primeira corda tocada da esquerda (6ª → 1ª): indica o baixo. */
  const bassCol = relFrets.findIndex((rf) => rf >= 0)

  const dw = chordpicDisplayWidthPx(CHORDPIC_DISPLAY_H)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={dw}
      height={CHORDPIC_DISPLAY_H}
      viewBox={`${CHORDPIC_VIEWBOX.x} 0 ${CHORDPIC_VIEWBOX.w} ${CHORDPIC_VIEWBOX.h}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-auto max-h-[140px] w-full min-w-[72px] max-w-[200px] shrink-0"
      style={{
        aspectRatio: `${CHORDPIC_VIEWBOX.w} / ${CHORDPIC_VIEWBOX.h}`
      }}
    >
      <rect width="100%" height="100%" fill="#fff" />
      <text
        x={200}
        y={0}
        fontFamily='Arial, "Helvetica Neue", Helvetica, sans-serif'
        fontSize={37}
        textAnchor="middle"
        fill="#000"
      >
        <tspan dy={48.1} x={200}>
          {chordName}
        </tspan>
      </text>

      {baseFret > 1 && (
        <text
          x={68}
          y={CHORDPIC_NUT_Y + 12}
          fontSize={18}
          fill="#000"
          fontFamily='Arial, "Helvetica Neue", Helvetica, sans-serif'
        >
          {baseFret}fr
        </text>
      )}

      <line
        x1={77.75}
        y1={CHORDPIC_NUT_Y}
        x2={322.25}
        y2={CHORDPIC_NUT_Y}
        strokeWidth={10}
        stroke="#000"
      />
      {CHORDPIC_FRET_LINES.map((y) => (
        <line
          key={y}
          x1={80}
          y1={y}
          x2={320}
          y2={y}
          strokeWidth={4.5}
          stroke="#000"
        />
      ))}
      {CHORDPIC_STRING_X.map((x) => (
        <line
          key={x}
          x1={x}
          y1={CHORDPIC_STRING_TOP}
          x2={x}
          y2={CHORDPIC_STRING_BOTTOM}
          strokeWidth={4.5}
          stroke="#000"
        />
      ))}

      {barreRects.map((r, i) => (
        <rect
          key={`barre-${i}`}
          x={r.x1}
          y={r.cy - 8}
          width={r.x2 - r.x1}
          height={16}
          rx={4}
          fill="#000"
        />
      ))}

      {relFrets.map((rf, col) => {
        if (rf <= 0) return null
        if (isCoveredByBarre(col, rf, barreRects)) return null
        const cy = chordpicFretCenterY(rf)
        if (cy == null) return null
        const fn = fingers[col] ?? 0
        const cx = CHORDPIC_STRING_X[col]
        return (
          <g key={`f-${col}`}>
            <circle r={CHORDPIC_FINGER_R} cx={cx} cy={cy} fill="#000" />
            {fn > 0 && (
              <text
                x={cx}
                y={cy}
                fontFamily='Arial, "Helvetica Neue", Helvetica, sans-serif'
                fontSize={14}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
              >
                {fn}
              </text>
            )}
          </g>
        )
      })}

      {relFrets.map((rf, col) => {
        const cx = CHORDPIC_STRING_X[col]
        const cy = CHORDPIC_STATUS_ROW_Y
        if (rf < 0) {
          return (
            <g key={`st-${col}`}>{statusMuteX(cx, cy)}</g>
          )
        }
        const isBass = bassCol === col
        return (
          <circle
            key={`st-${col}`}
            r={CHORDPIC_STATUS_ROW_R}
            cx={cx}
            cy={cy}
            fill={isBass ? CHORDPIC_STATUS_GRAY : 'none'}
            stroke={CHORDPIC_STATUS_GRAY}
            strokeWidth={2.5}
          />
        )
      })}
    </svg>
  )
}
