import React, { useMemo } from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import type { TabOverlayProps } from './diagram-overlay-types'
import { frameOf, LAYOUT } from './overlay-layout'
import {
  lerpTabNoteColor,
  TAB_BADGE_FILL,
  TAB_LINE,
  TAB_STRING_COUNT,
  TAB_STRING_LABELS,
  type TabColumn,
} from './tab-shared'

/** Fade branco → roxo ao redor do instante da coluna. */
const COLOR_FADE_SEC = 0.18

export const TAB_OVERLAY_DEMO: TabOverlayProps = {
  columns: [
    [null, null, null, 2, null, null],
    [null, null, 0, null, null, null],
    [null, 0, null, null, null, null],
    [0, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, 2, null, null, null],
    [null, 3, null, null, null, null],
    [2, null, null, null, null, null],
  ],
  chords: ['Em', '', '', '', '', 'D', '', ''],
  marks: [
    { t: 0.6, col: 0 },
    { t: 1.0, col: 1 },
    { t: 1.4, col: 2 },
    { t: 1.8, col: 3 },
    { t: 2.6, col: 5 },
    { t: 3.0, col: 6 },
    { t: 3.4, col: 7 },
  ],
  durationSec: 5,
  fps: 24,
  width: 1080,
  height: 1920,
  centerY: 0.78,
}

function noteLabel(v: number | null): string {
  if (v == null) return ''
  if (v < 0) return '×'
  return String(v)
}

function progressAt(marks: TabOverlayProps['marks'], col: number, timeSec: number): number {
  const mark = marks.find((m) => m.col === col)
  if (!mark) return 0
  if (timeSec < mark.t) return 0
  if (COLOR_FADE_SEC <= 0) return 1
  return Math.min(1, (timeSec - mark.t) / COLOR_FADE_SEC)
}

/** Overlay transparente de tablatura com sync por coluna (branco → roxo). */
export const TabOverlayComposition: React.FC<TabOverlayProps> = (props) => {
  const frame = useCurrentFrame()
  const { width, height, u } = frameOf(props)
  const timeSec = frame / Math.max(1, props.fps)
  const columns: TabColumn[] = props.columns?.length
    ? props.columns
    : TAB_OVERLAY_DEMO.columns
  const chords = props.chords || []
  const marks = props.marks?.length ? props.marks : TAB_OVERLAY_DEMO.marks
  const centerY = props.centerY ?? LAYOUT.tabCenterY

  const colCount = Math.max(columns.length, 1)
  const badgeR = 14 * u
  const padLeft = badgeR * 2 + 22 * u
  const padRight = 28 * u
  const chordH = 28 * u
  const stringGap = 34 * u
  const colGap = 34 * u
  const topY = chordH + 8 * u
  const gridH = (TAB_STRING_COUNT - 1) * stringGap
  const staffW = padLeft + colCount * colGap + padRight
  const staffH = topY + gridH + 20 * u
  const noteFont = 20 * u
  const scale = Math.min(1, (width * 0.92) / staffW)
  const shadow = `0 ${2 * u}px ${8 * u}px rgba(0,0,0,0.55)`

  const progresses = useMemo(
    () => columns.map((_, c) => progressAt(marks, c, timeSec)),
    [columns, marks, timeSec]
  )

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <div
        style={{
          position: 'absolute',
          left: width / 2,
          top: height * centerY,
          transform: `translate(-50%, -50%) scale(${scale})`,
          width: staffW,
          height: staffH,
        }}
      >
        <svg
          width={staffW}
          height={staffH}
          viewBox={`0 0 ${staffW} ${staffH}`}
          style={{ overflow: 'visible', filter: `drop-shadow(${shadow})` }}
        >
          {TAB_STRING_LABELS.map((label, s) => {
            const y = topY + s * stringGap
            return (
              <g key={`str-${s}`}>
                <circle cx={badgeR + 4 * u} cy={y} r={badgeR} fill={TAB_BADGE_FILL} />
                <text
                  x={badgeR + 4 * u}
                  y={y + 5 * u}
                  textAnchor="middle"
                  fill="#111"
                  fontSize={13 * u}
                  fontWeight={800}
                  fontFamily="ui-monospace, 'Roboto Mono', monospace"
                >
                  {label}
                </text>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={staffW - padRight}
                  y2={y}
                  stroke={TAB_LINE}
                  strokeWidth={1.6 * u}
                  strokeDasharray={`${5 * u} ${5 * u}`}
                  strokeLinecap="round"
                />
              </g>
            )
          })}

          {columns.map((col, c) => {
            const x = padLeft + c * colGap + colGap / 2
            const chord = (chords[c] || '').trim()
            const color = lerpTabNoteColor(progresses[c] || 0)
            return (
              <g key={`col-${c}`}>
                {chord ? (
                  <text
                    x={x}
                    y={chordH - 4 * u}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={16 * u}
                    fontWeight={700}
                    fontFamily="system-ui, sans-serif"
                    style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.45)', strokeWidth: 3 * u }}
                  >
                    {chord}
                  </text>
                ) : null}
                {TAB_STRING_LABELS.map((_, s) => {
                  const label = noteLabel(col[s] ?? null)
                  if (!label) return null
                  const y = topY + s * stringGap
                  return (
                    <text
                      key={`n-${c}-${s}`}
                      x={x}
                      y={y + noteFont / 3}
                      textAnchor="middle"
                      fill={color}
                      fontSize={noteFont}
                      fontWeight={700}
                      fontFamily="ui-monospace, 'Roboto Mono', monospace"
                      style={{
                        paintOrder: 'stroke',
                        stroke: 'rgba(0,0,0,0.35)',
                        strokeWidth: 2.5 * u,
                      }}
                    >
                      {label}
                    </text>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>
    </AbsoluteFill>
  )
}
