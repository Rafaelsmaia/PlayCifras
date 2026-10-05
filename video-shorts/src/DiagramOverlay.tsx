import React from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { CIFRA_VIDEO_FONT, useProximaSoft } from './Short'
import type { DiagramOverlayProps, DiagramShape } from './diagram-overlay-types'
import { LAYOUT, OVERLAY_INK, frameOf } from './overlay-layout'

const DISPLAY_FRETS = 4
const STRINGS = 6

/** A troca começa um pouco antes do marcador para o novo acorde "cair" no tempo. */
const PRE_SEC = 0.12
const TRANS_SEC = 0.3
const INTRO_SEC = 0.35
const OUTRO_SEC = 0.3

/**
 * Medidas do PlayCifrasDiagramSvg do site (unidades dele), multiplicadas por `k`.
 * TITLE é maior que o padrão do site, como nos vídeos.
 */
const BASE = {
  stringGap: 14,
  fretGap: 19,
  dot: 6.6,
  nut: 3.5,
  fretLine: 1.15,
  topFade: 12,
  bottomFade: 16,
  statusGap: 14,
  title: 21,
  titleGap: 14,
}
/** Largura da grade = 14,7% da largura do quadro 1080. */
const K_PER_U = 2.27

const easeMove = Easing.inOut(Easing.cubic)
const easePop = Easing.out(Easing.back(1.7))
const easeIn = Easing.out(Easing.cubic)

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
  width: 1080,
  height: 1920,
}

export const DiagramOverlayComposition: React.FC<DiagramOverlayProps> = (props) => {
  const { marks, shapes, durationSec } = props
  useProximaSoft()
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps
  const { width, height, u } = frameOf(props)
  const k = K_PER_U * u

  const stringGap = BASE.stringGap * k
  const fretGap = BASE.fretGap * k
  const rDot = BASE.dot * k
  const gridW = stringGap * (STRINGS - 1)
  const gridH = fretGap * DISPLAY_FRETS
  const left = Math.round(width * LAYOUT.diagramCenterX - gridW / 2)
  const gridTop = Math.round(height * LAYOUT.diagramGridTop)
  const gridBottom = gridTop + gridH
  const stringTop = gridTop - BASE.topFade * k
  const stringBottom = gridBottom + BASE.bottomFade * k
  const statusY = stringBottom + BASE.statusGap * k
  const stringX = (i: number) => left + i * stringGap
  const fretY = (rel: number) => gridTop + (rel - 0.5) * fretGap
  const lerp = (a: number, b: number, e: number) => a + (b - a) * e

  let idx = -1
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].t - PRE_SEC <= t) idx = i
  }

  const firstStart = marks.length ? marks[0].t - PRE_SEC : 0
  const cardIn = easeIn(
    interpolate(t, [firstStart - INTRO_SEC, firstStart], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  )
  const cardOut = interpolate(t, [durationSec - OUTRO_SEC, durationSec], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const alpha = Math.min(cardIn, cardOut)
  if (alpha <= 0) return <AbsoluteFill style={{ backgroundColor: 'transparent' }} />
  const groupScale = 0.92 + 0.08 * cardIn

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
  const nut = lerp(nutFrom, nutTo, e)

  const fontFamily = `"${CIFRA_VIDEO_FONT}", system-ui, sans-serif`
  const cx = left + gridW / 2
  const cy = (stringTop + statusY) / 2
  const titleFs = BASE.title * k
  const titleY = gridTop - BASE.titleGap * k

  const renderName = (name: string, opacity: number, dy: number) =>
    name && opacity > 0.001 ? (
      <text
        x={cx}
        y={titleY + dy}
        textAnchor="middle"
        fontFamily={fontFamily}
        fontWeight={700}
        fontSize={titleFs}
        fill={OVERLAY_INK}
        opacity={opacity}
      >
        {name}
      </text>
    ) : null

  const renderBaseFret = (s: DiagramShape | null, opacity: number, key: string) =>
    s && s.baseFret > 1 && opacity > 0.001 ? (
      <text
        key={key}
        x={left - 10 * k}
        y={fretY(1) + 3.5 * k}
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight={700}
        fontSize={11 * k}
        fill={OVERLAY_INK}
        opacity={opacity}
      >
        {s.baseFret}ª
      </text>
    ) : null

  const sameBase = (prev?.baseFret ?? 0) === (next?.baseFret ?? 0)

  const barreCount = Math.max(prev?.barres.length ?? 0, next?.barres.length ?? 0)
  const barres: React.ReactNode[] = []
  for (let b = 0; b < barreCount; b++) {
    const a = prev?.barres[b]
    const z = next?.barres[b]
    let rel: number
    let from: number
    let to: number
    let opacity = 1
    let scaleX = 1
    if (a && z) {
      rel = lerp(a.rel, z.rel, e)
      from = lerp(a.fromCol, z.fromCol, e)
      to = lerp(a.toCol, z.toCol, e)
    } else if (a) {
      ;({ rel, fromCol: from, toCol: to } = a)
      opacity = 1 - e
      scaleX = 1 - 0.3 * e
    } else {
      ;({ rel, fromCol: from, toCol: to } = z!)
      opacity = Math.min(1, p * 2)
      scaleX = 0.7 + 0.3 * pop
    }
    const x1 = stringX(from) - rDot
    const x2 = stringX(to) + rDot
    const mid = (x1 + x2) / 2
    const w = (x2 - x1) * scaleX
    barres.push(
      <rect
        key={`barre-${b}`}
        x={mid - w / 2}
        y={fretY(rel) - rDot * 0.85}
        width={w}
        height={rDot * 1.7}
        rx={rDot}
        fill={OVERLAY_INK}
        opacity={opacity}
      />
    )
  }

  /** Número do dedo em preto sólido sobre a bolinha (vazado deixaria a corda aparecer por dentro). */
  const fingerLabel = (finger: number, op: number, key: string) =>
    finger > 0 && op > 0.001 ? (
      <text
        key={key}
        x={0}
        y={3.2 * k}
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight={700}
        fontSize={9 * k}
        fill="#000"
        opacity={op}
      >
        {finger}
      </text>
    ) : null

  const dotsA = dotsOf(prev)
  const dotsB = dotsOf(next)
  const keys = Array.from(new Set([...dotsA, ...dotsB].map((d) => d.key)))
  const dotCircles: React.ReactNode[] = []
  for (const key of keys) {
    const a = dotsA.find((d) => d.key === key)
    const z = dotsB.find((d) => d.key === key)
    let x: number
    let y: number
    let scale = 1
    let opacity = 1
    if (a && z) {
      x = lerp(stringX(a.string), stringX(z.string), e)
      y = lerp(fretY(a.rel), fretY(z.rel), e)
    } else if (a) {
      x = stringX(a.string)
      y = fretY(a.rel)
      scale = 1 - e
      opacity = 1 - e
    } else {
      x = stringX(z!.string)
      y = fretY(z!.rel)
      scale = Math.max(0, pop)
      opacity = Math.min(1, p * 2)
    }
    const transform = `translate(${x} ${y}) scale(${scale})`
    const fingerA = a?.finger ?? 0
    const fingerB = z?.finger ?? 0
    dotCircles.push(
      <g key={`dot-${key}`} transform={transform} opacity={opacity}>
        <circle r={rDot} fill={OVERLAY_INK} />
        {!a || !z || fingerA === fingerB
          ? fingerLabel(z ? fingerB : fingerA, 1, 'f')
          : [fingerLabel(fingerA, 1 - e, 'fa'), fingerLabel(fingerB, e, 'fb')]}
      </g>
    )
  }

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
            y={statusY}
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight={700}
            fontSize={13.5 * k}
            fill={OVERLAY_INK}
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
          cy={statusY - 3.5 * k}
          r={3.4 * k}
          fill={s === 'bass' ? OVERLAY_INK : 'none'}
          stroke={OVERLAY_INK}
          strokeWidth={1.25 * k}
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

  const span = stringBottom - stringTop
  const pct = (y: number) => `${((y - stringTop) / span) * 100}%`
  /** Na pestana zero as cordas começam no capotraste; fora dela surgem em degradê. */
  const fadeFrom = lerp(stringTop + BASE.topFade * k * 0.15, gridTop - 0.5, nut)

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient
            id="str-fade"
            x1="0"
            y1={stringTop}
            x2="0"
            y2={stringBottom}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={OVERLAY_INK} stopOpacity={0} />
            <stop offset={pct(fadeFrom)} stopColor={OVERLAY_INK} stopOpacity={0} />
            <stop offset={pct(gridTop)} stopColor={OVERLAY_INK} stopOpacity={1} />
            <stop offset={pct(gridBottom)} stopColor={OVERLAY_INK} stopOpacity={1} />
            <stop offset="100%" stopColor={OVERLAY_INK} stopOpacity={0} />
          </linearGradient>
        </defs>
        <g
          opacity={alpha}
          transform={`translate(${cx} ${cy}) scale(${groupScale}) translate(${-cx} ${-cy})`}
        >
          {renderName(prevName, Math.max(0, 1 - 2 * e), -18 * k * e)}
          {renderName(
            nextName,
            idx > 0 ? Math.max(0, 2 * e - 1) : Math.min(1, p * 2),
            18 * k * (1 - e)
          )}

          {Array.from({ length: DISPLAY_FRETS }, (_, f) => (
            <line
              key={`fret-${f + 1}`}
              x1={left}
              y1={gridTop + (f + 1) * fretGap}
              x2={left + gridW}
              y2={gridTop + (f + 1) * fretGap}
              stroke={OVERLAY_INK}
              strokeWidth={BASE.fretLine * k}
              strokeLinecap="square"
            />
          ))}
          <line
            x1={left}
            y1={gridTop}
            x2={left + gridW}
            y2={gridTop}
            stroke={OVERLAY_INK}
            strokeWidth={lerp(BASE.fretLine, BASE.nut, nut) * k}
            strokeLinecap="square"
            opacity={nut}
          />
          {Array.from({ length: STRINGS }, (_, i) => (
            <line
              key={`str-${i}`}
              x1={stringX(i)}
              y1={stringTop}
              x2={stringX(i)}
              y2={stringBottom}
              stroke="url(#str-fade)"
              strokeWidth={(1.05 + (STRINGS - 1 - i) * 0.12) * k}
            />
          ))}

          {sameBase
            ? renderBaseFret(next, 1, 'bf')
            : [renderBaseFret(prev, 1 - e, 'bfa'), renderBaseFret(next, e, 'bfb')]}
          {statuses}
          {barres}
          {dotCircles}
        </g>
      </svg>
    </AbsoluteFill>
  )
}
