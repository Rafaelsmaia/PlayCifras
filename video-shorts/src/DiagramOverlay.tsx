import React from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { CIFRA_VIDEO_FONT, useProximaSoft } from './Short'
import type { DiagramOverlayProps, DiagramShape } from './diagram-overlay-types'

export const DIAGRAM_OVERLAY_WIDTH = 600
export const DIAGRAM_OVERLAY_HEIGHT = 780

const LINE = '#222'
const DISPLAY_FRETS = 4
const STRINGS = 6

/** A troca começa um pouco antes do marcador para o novo acorde "cair" no tempo. */
const PRE_SEC = 0.12
const TRANS_SEC = 0.3
const INTRO_SEC = 0.35
const OUTRO_SEC = 0.3

const CARD = { x: 40, y: 40, w: 520, h: 700, r: 44 }
const NAME_Y = 128
const GRID_TOP = 210
const GRID_LEFT = 100
const STRING_GAP = 64
const FRET_GAP = 96
const GRID_W = STRING_GAP * (STRINGS - 1)
const GRID_H = FRET_GAP * DISPLAY_FRETS
const STATUS_Y = GRID_TOP + GRID_H + 52
const DOT_R = 27

const stringX = (i: number) => GRID_LEFT + i * STRING_GAP
const fretY = (rel: number) => GRID_TOP + (rel - 0.5) * FRET_GAP
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

const easeMove = Easing.inOut(Easing.cubic)
const easePop = Easing.out(Easing.back(1.7))
const easeCard = Easing.out(Easing.cubic)

type Dot = { key: string; string: number; rel: number; finger: number }
type Status = 'mute' | 'played' | 'bass'

/** Bolinhas fora da pestana; a chave segue o dedo para ele deslizar entre cordas. */
function dotsOf(shape: DiagramShape | null): Dot[] {
  if (!shape) return []
  const dots: Dot[] = []
  for (let i = 0; i < STRINGS; i++) {
    const rel = shape.frets[i]
    if (!(rel > 0 && rel <= DISPLAY_FRETS)) continue
    const underBarre = shape.barres.some(
      (b) => b.rel === rel && i >= b.fromCol && i <= b.toCol
    )
    if (!underBarre) dots.push({ key: '', string: i, rel, finger: shape.fingers[i] ?? 0 })
  }
  for (const d of dots) {
    const uniqueFinger = d.finger > 0 && dots.filter((o) => o.finger === d.finger).length === 1
    d.key = uniqueFinger ? `f${d.finger}` : `s${d.string}`
  }
  return dots
}

function statusAt(shape: DiagramShape | null, i: number): Status | null {
  if (!shape || shape.frets[i] === undefined) return null
  if (shape.frets[i] === -1) return 'mute'
  const firstPlayed = shape.frets.findIndex((f) => f !== -1)
  return i === firstPlayed ? 'bass' : 'played'
}

function chordFontSize(name: string) {
  return Math.min(104, Math.floor(430 / Math.max(1, name.length * 0.62)))
}

const DEMO_SHAPES: Record<string, DiagramShape> = {
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], baseFret: 1, barres: [] },
  D: { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], baseFret: 1, barres: [] },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], baseFret: 1, barres: [] },
  F: {
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    baseFret: 1,
    barres: [{ rel: 1, fromCol: 0, toCol: 5 }],
  },
  Bm: {
    frets: [-1, 1, 3, 3, 2, 1],
    fingers: [0, 1, 3, 4, 2, 1],
    baseFret: 2,
    barres: [{ rel: 1, fromCol: 1, toCol: 5 }],
  },
}

export const DIAGRAM_OVERLAY_DEMO: DiagramOverlayProps = {
  marks: [
    { t: 0.5, chord: 'G' },
    { t: 2.5, chord: 'D' },
    { t: 4.5, chord: 'Em' },
    { t: 6.5, chord: 'Bm' },
    { t: 8.5, chord: 'F' },
  ],
  shapes: DEMO_SHAPES,
  durationSec: 11,
  fps: 30,
}

export const DiagramOverlayComposition: React.FC<DiagramOverlayProps> = ({
  marks,
  shapes,
  durationSec,
}) => {
  useProximaSoft()
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps

  let idx = -1
  for (let k = 0; k < marks.length; k++) {
    if (marks[k].t - PRE_SEC <= t) idx = k
  }

  const firstStart = marks.length ? marks[0].t - PRE_SEC : 0
  const cardIn = easeCard(
    interpolate(t, [firstStart - INTRO_SEC, firstStart], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  )
  const cardOut = interpolate(t, [durationSec - OUTRO_SEC, durationSec], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const cardAlpha = Math.min(cardIn, cardOut)
  if (cardAlpha <= 0) return <AbsoluteFill style={{ backgroundColor: 'transparent' }} />
  const cardScale = 0.9 + 0.1 * cardIn

  const prevName = idx > 0 ? marks[idx - 1].chord : ''
  const nextName = idx >= 0 ? marks[idx].chord : ''
  const prev = prevName ? shapes[prevName] ?? null : null
  const next = nextName ? shapes[nextName] ?? null : null

  const p =
    idx >= 0
      ? interpolate(t, [marks[idx].t - PRE_SEC, marks[idx].t - PRE_SEC + TRANS_SEC], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0
  const e = easeMove(p)
  const pop = easePop(p)

  const atNut = (s: DiagramShape | null) => (s ? (s.baseFret <= 1 ? 1 : 0) : null)
  const nutFrom = atNut(prev) ?? atNut(next) ?? 1
  const nutTo = atNut(next) ?? nutFrom
  const nutOpacity = lerp(nutFrom, nutTo, e)

  const fontFamily = `"${CIFRA_VIDEO_FONT}", system-ui, sans-serif`
  const cx = CARD.x + CARD.w / 2
  const cy = CARD.y + CARD.h / 2

  const renderName = (name: string, opacity: number, dy: number) =>
    name && opacity > 0.001 ? (
      <text
        x={CARD.w / 2}
        y={NAME_Y + dy}
        textAnchor="middle"
        fontFamily={fontFamily}
        fontWeight={700}
        fontSize={chordFontSize(name)}
        fill={LINE}
        opacity={opacity}
      >
        {name}
      </text>
    ) : null

  const renderBaseFret = (s: DiagramShape | null, opacity: number, key: string) =>
    s && s.baseFret > 1 && opacity > 0.001 ? (
      <text
        key={key}
        x={GRID_LEFT - 52}
        y={fretY(1) + 12}
        textAnchor="middle"
        fontFamily={fontFamily}
        fontWeight={700}
        fontSize={34}
        fill={LINE}
        opacity={opacity}
      >
        {s.baseFret}ª
      </text>
    ) : null

  const sameBase = (prev?.baseFret ?? 0) === (next?.baseFret ?? 0)

  const barreCount = Math.max(prev?.barres.length ?? 0, next?.barres.length ?? 0)
  const barres: React.ReactNode[] = []
  for (let k = 0; k < barreCount; k++) {
    const a = prev?.barres[k]
    const b = next?.barres[k]
    let rel: number
    let from: number
    let to: number
    let opacity = 1
    let scaleX = 1
    if (a && b) {
      rel = lerp(a.rel, b.rel, e)
      from = lerp(a.fromCol, b.fromCol, e)
      to = lerp(a.toCol, b.toCol, e)
    } else if (a) {
      ;({ rel, fromCol: from, toCol: to } = a)
      opacity = 1 - e
      scaleX = 1 - 0.3 * e
    } else {
      ;({ rel, fromCol: from, toCol: to } = b!)
      opacity = Math.min(1, p * 2)
      scaleX = 0.7 + 0.3 * pop
    }
    const x1 = stringX(from) - DOT_R
    const x2 = stringX(to) + DOT_R
    const mid = (x1 + x2) / 2
    const w = (x2 - x1) * scaleX
    barres.push(
      <rect
        key={`barre-${k}`}
        x={mid - w / 2}
        y={fretY(rel) - DOT_R * 0.85}
        width={w}
        height={DOT_R * 1.7}
        rx={DOT_R * 0.85}
        fill={LINE}
        opacity={opacity}
      />
    )
  }

  const fingerLabel = (finger: number, op: number, key: string) =>
    finger > 0 && op > 0.001 ? (
      <text
        key={key}
        x={0}
        y={11}
        textAnchor="middle"
        fontFamily={fontFamily}
        fontWeight={700}
        fontSize={32}
        fill="#fff"
        opacity={op}
      >
        {finger}
      </text>
    ) : null

  const dotsA = dotsOf(prev)
  const dotsB = dotsOf(next)
  const keys = Array.from(new Set([...dotsA, ...dotsB].map((d) => d.key)))
  const dots = keys.map((key) => {
    const a = dotsA.find((d) => d.key === key)
    const b = dotsB.find((d) => d.key === key)
    let x: number
    let y: number
    let scale = 1
    let opacity = 1
    if (a && b) {
      x = lerp(stringX(a.string), stringX(b.string), e)
      y = lerp(fretY(a.rel), fretY(b.rel), e)
    } else if (a) {
      x = stringX(a.string)
      y = fretY(a.rel)
      scale = 1 - e
      opacity = 1 - e
    } else {
      x = stringX(b!.string)
      y = fretY(b!.rel)
      scale = Math.max(0, pop)
      opacity = Math.min(1, p * 2)
    }
    const fingerA = a?.finger ?? 0
    const fingerB = b?.finger ?? 0
    return (
      <g key={`dot-${key}`} transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
        <circle r={DOT_R} fill={LINE} />
        {!a || !b || fingerA === fingerB
          ? fingerLabel(b ? fingerB : fingerA, 1, 'f')
          : [fingerLabel(fingerA, 1 - e, 'fa'), fingerLabel(fingerB, e, 'fb')]}
      </g>
    )
  })

  const statuses: React.ReactNode[] = []
  for (let i = 0; i < STRINGS; i++) {
    const x = stringX(i)
    const sa = statusAt(prev, i)
    const sb = statusAt(next, i)
    const renderStatus = (s: Status | null, op: number, key: string) => {
      if (!s || op <= 0.001) return null
      if (s === 'mute') {
        return (
          <text
            key={key}
            x={x}
            y={STATUS_Y + 14}
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight={700}
            fontSize={44}
            fill={LINE}
            opacity={op}
          >
            ×
          </text>
        )
      }
      return (
        <circle
          key={key}
          cx={x}
          cy={STATUS_Y}
          r={11}
          fill={s === 'bass' ? LINE : 'none'}
          stroke={LINE}
          strokeWidth={4}
          opacity={op}
        />
      )
    }
    if (sa === sb) statuses.push(renderStatus(sb, 1, `st-${i}`))
    else if (!prev) statuses.push(renderStatus(sb, Math.min(1, p * 2), `st-${i}`))
    else {
      statuses.push(renderStatus(sa, 1 - e, `sta-${i}`))
      statuses.push(renderStatus(sb, e, `stb-${i}`))
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <svg
        width={DIAGRAM_OVERLAY_WIDTH}
        height={DIAGRAM_OVERLAY_HEIGHT}
        viewBox={`0 0 ${DIAGRAM_OVERLAY_WIDTH} ${DIAGRAM_OVERLAY_HEIGHT}`}
      >
        <defs>
          <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#000" floodOpacity="0.35" />
          </filter>
        </defs>
        <g
          opacity={cardAlpha}
          transform={`translate(${cx} ${cy}) scale(${cardScale}) translate(${-cx} ${-cy})`}
        >
          <rect
            x={CARD.x}
            y={CARD.y}
            width={CARD.w}
            height={CARD.h}
            rx={CARD.r}
            fill="#fff"
            filter="url(#card-shadow)"
          />
          <g transform={`translate(${CARD.x} ${CARD.y})`}>
            {renderName(prevName, Math.max(0, 1 - 2 * e), -50 * e)}
            {renderName(
              nextName,
              idx > 0 ? Math.max(0, 2 * e - 1) : Math.min(1, p * 2),
              50 * (1 - e)
            )}

            {Array.from({ length: DISPLAY_FRETS + 1 }, (_, f) => (
              <line
                key={`fret-${f}`}
                x1={GRID_LEFT}
                y1={GRID_TOP + f * FRET_GAP}
                x2={GRID_LEFT + GRID_W}
                y2={GRID_TOP + f * FRET_GAP}
                stroke={LINE}
                strokeWidth={3}
                strokeLinecap="square"
              />
            ))}
            <rect
              x={GRID_LEFT - 2}
              y={GRID_TOP - 12}
              width={GRID_W + 4}
              height={13}
              fill={LINE}
              opacity={nutOpacity}
            />
            {Array.from({ length: STRINGS }, (_, i) => (
              <line
                key={`str-${i}`}
                x1={stringX(i)}
                y1={GRID_TOP}
                x2={stringX(i)}
                y2={GRID_TOP + GRID_H}
                stroke={LINE}
                strokeWidth={2.6 + (STRINGS - 1 - i) * 0.35}
              />
            ))}

            {sameBase
              ? renderBaseFret(next, 1, 'bf')
              : [renderBaseFret(prev, 1 - e, 'bfa'), renderBaseFret(next, e, 'bfb')]}
            {barres}
            {dots}
            {statuses}
          </g>
        </g>
      </svg>
    </AbsoluteFill>
  )
}
