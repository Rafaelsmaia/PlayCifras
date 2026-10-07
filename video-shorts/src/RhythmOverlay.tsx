import React from 'react'
import { AbsoluteFill } from 'remotion'
import { useFontReady } from './LyricsOverlay'
import { CIFRA_VIDEO_FONT } from './Short'
import type { RhythmOverlayProps, RhythmStroke } from './diagram-overlay-types'
import { LAYOUT, LYRIC_CHORD_COLOR, OVERLAY_INK, frameOf } from './overlay-layout'

const LABEL_PX = 52
const ARROW_W = 50
const ARROW_H = 74
const ARROW_GAP = 16
const LABEL_GAP = 18

export const RHYTHM_OVERLAY_DEMO: RhythmOverlayProps = {
  strokes: ['down', 'up', 'down', 'down', 'down', 'up', 'down'],
  label: 'Ritmo:',
  width: 1080,
  height: 1920,
}

/** Seta grossa com ponta triangular; para cima = mesma seta girada (em magenta). */
const Arrow: React.FC<{ stroke: RhythmStroke; u: number }> = ({ stroke, u }) => {
  const w = ARROW_W * u
  const h = ARROW_H * u
  const shaft = w * 0.36
  const head = h * 0.46
  const pad = w * 0.08
  const color = stroke === 'up' ? LYRIC_CHORD_COLOR : OVERLAY_INK
  const d = [
    `M ${(w - shaft) / 2} 0`,
    `H ${(w + shaft) / 2}`,
    `V ${h - head}`,
    `H ${w}`,
    `L ${w / 2} ${h}`,
    `L 0 ${h - head}`,
    `H ${(w - shaft) / 2}`,
    'Z',
  ].join(' ')
  return (
    <svg
      width={w + pad * 2}
      height={h + pad * 2}
      viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`}
      style={{ overflow: 'visible' }}
    >
      <path
        d={d}
        fill={color}
        stroke={color}
        strokeWidth={pad * 0.9}
        strokeLinejoin="round"
        transform={stroke === 'up' ? `rotate(180 ${w / 2} ${h / 2})` : undefined}
      />
    </svg>
  )
}

export const RhythmOverlayComposition: React.FC<RhythmOverlayProps> = (props) => {
  useFontReady()
  const { width, height, u } = frameOf(props)
  const strokes = props.strokes.length ? props.strokes : RHYTHM_OVERLAY_DEMO.strokes
  const centerY = props.centerY ?? LAYOUT.rhythmCenterY

  const arrowBox = ARROW_W * u * 1.16
  const rowWidth = strokes.length * arrowBox + (strokes.length - 1) * ARROW_GAP * u
  const scale = Math.min(1, (width * LAYOUT.rhythmMaxWidth) / rowWidth)
  const shadow = `0 ${2 * u}px ${10 * u}px rgba(0,0,0,0.45)`

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          width,
          top: height * centerY,
          transform: `translateY(-50%) scale(${scale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: LABEL_GAP * u,
        }}
      >
        {props.label ? (
          <div
            style={{
              fontFamily: `"${CIFRA_VIDEO_FONT}", system-ui, sans-serif`,
              fontWeight: 700,
              fontSize: LABEL_PX * u,
              lineHeight: 1.1,
              color: OVERLAY_INK,
              textShadow: shadow,
            }}
          >
            {props.label}
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            gap: ARROW_GAP * u,
            filter: `drop-shadow(${shadow})`,
          }}
        >
          {strokes.map((s, i) => (
            <Arrow key={i} stroke={s} u={u} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  )
}
