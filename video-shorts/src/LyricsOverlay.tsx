import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  AbsoluteFill,
  Easing,
  continueRender,
  delayRender,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { CIFRA_VIDEO_FONT, ensureProximaSoft } from './Short'
import type { LyricOverlayLine, LyricScreen, LyricsOverlayProps } from './diagram-overlay-types'
import { LAYOUT, LYRIC_CHORD_COLOR, OVERLAY_INK, frameOf } from './overlay-layout'

/** A tela troca um pouco antes do marcador, como os diagramas. */
const PRE_SEC = 0.1
const FADE_SEC = 0.22
const OUTRO_SEC = 0.3

const LYRIC_PX = 45
const CHORD_PX = 30
const LINE_GAP_PX = 14

export const LYRICS_OVERLAY_DEMO: LyricsOverlayProps = {
  screens: [
    {
      t: 0.5,
      lines: [
        { text: "Aquieta minh'alma", chords: [{ chord: 'A9', at: 0 }, { chord: 'E', at: 13 }] },
        { text: 'Faz meu coração ouvir', chords: [] },
      ],
    },
    {
      t: 3,
      lines: [
        { text: 'Tua voz', chords: [{ chord: 'F#m11/C#', at: 4 }, { chord: 'D9', at: 7 }] },
        { text: 'Me chama pra perto', chords: [{ chord: 'A9', at: 0 }, { chord: 'E', at: 12 }] },
      ],
    },
    { t: 5.5, lines: [] },
  ],
  durationSec: 7,
  fps: 30,
  width: 1080,
  height: 1920,
}

/** Só libera o frame depois que a fonte carregou e o bloco foi medido com ela. */
function useFontReady() {
  const [handle] = useState(() => delayRender('Proxima Soft Bold'))
  const [ready, setReady] = useState(false)
  useEffect(() => {
    ensureProximaSoft()
      .catch((err) => console.error(err))
      .finally(() => setReady(true))
  }, [])
  useEffect(() => {
    if (ready) continueRender(handle)
  }, [ready, handle])
  return ready
}

type Segment = { text: string; chord: string }

function segmentsOf(line: LyricOverlayLine): Segment[] {
  const byPos = new Map<number, string[]>()
  for (const c of line.chords) {
    const at = Math.min(line.text.length, Math.max(0, c.at))
    byPos.set(at, [...(byPos.get(at) || []), c.chord])
  }
  const cuts = Array.from(byPos.keys()).sort((a, b) => a - b)
  const segs: Segment[] = []
  if (!cuts.length || cuts[0] > 0) {
    segs.push({ text: line.text.slice(0, cuts.length ? cuts[0] : undefined), chord: '' })
  }
  cuts.forEach((at, i) => {
    segs.push({
      text: line.text.slice(at, i + 1 < cuts.length ? cuts[i + 1] : undefined),
      chord: byPos.get(at)!.join(' '),
    })
  })
  return segs
}

const ScreenBlock: React.FC<{
  screen: LyricScreen
  u: number
  maxWidth: number
  fontReady: boolean
}> = ({ screen, u, maxWidth, fontReady }) => {
  const ref = useRef<HTMLDivElement>(null)
  const chordGap = CHORD_PX * u * 0.35

  /**
   * A letra nunca ganha espaços: acordes colados são empurrados para a direita
   * e a fonte encolhe se a linha (com acordes) passar da largura máxima.
   */
  useLayoutEffect(() => {
    const block = ref.current
    if (!block) return
    block.style.transform = 'none'
    const box = block.getBoundingClientRect()
    const zoom = box.width / Math.max(1, block.offsetWidth) || 1
    let minLeft = box.left
    let maxRight = box.right
    block.querySelectorAll<HTMLElement>('[data-line]').forEach((line) => {
      let prevRight = -Infinity
      line.querySelectorAll<HTMLElement>('[data-chord]').forEach((chord) => {
        chord.style.transform = 'none'
        const r = chord.getBoundingClientRect()
        const shift = Math.max(0, prevRight + chordGap * zoom - r.left)
        chord.style.transform = `translateX(${shift / zoom}px)`
        prevRight = r.right + shift
        minLeft = Math.min(minLeft, r.left + shift)
        maxRight = Math.max(maxRight, prevRight)
      })
    })
    const natural = (maxRight - minLeft) / zoom
    block.style.transform = `scale(${natural > maxWidth ? maxWidth / natural : 1})`
  }, [fontReady, screen, maxWidth, chordGap])

  const fontFamily = `"${CIFRA_VIDEO_FONT}", system-ui, sans-serif`
  const shadow = `0 ${2 * u}px ${10 * u}px rgba(0,0,0,0.45)`
  return (
    <div
      ref={ref}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: LINE_GAP_PX * u,
        transformOrigin: 'center center',
        fontFamily,
        fontWeight: 700,
      }}
    >
      {screen.lines.map((line, li) => (
        <div
          key={li}
          data-line
          style={{
            paddingTop: CHORD_PX * u * 1.25,
            whiteSpace: 'pre',
            fontSize: LYRIC_PX * u,
            lineHeight: 1.2,
            color: OVERLAY_INK,
            textShadow: shadow,
          }}
        >
          {segmentsOf(line).map((seg, si) =>
            seg.chord ? (
              <span key={si} style={{ position: 'relative' }}>
                <span
                  data-chord
                  style={{
                    position: 'absolute',
                    left: 0,
                    bottom: '100%',
                    fontSize: CHORD_PX * u,
                    lineHeight: 1.1,
                    color: LYRIC_CHORD_COLOR,
                  }}
                >
                  {seg.chord}
                </span>
                {seg.text || '\u200b'}
              </span>
            ) : (
              <span key={si}>{seg.text}</span>
            )
          )}
        </div>
      ))}
    </div>
  )
}

export const LyricsOverlayComposition: React.FC<LyricsOverlayProps> = (props) => {
  const { screens, durationSec } = props
  const fontReady = useFontReady()
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps
  const { width, height, u } = frameOf(props)

  const maxWidth = width * LAYOUT.lyricsMaxWidth
  const ease = Easing.out(Easing.cubic)
  const outro = interpolate(t, [durationSec - OUTRO_SEC, durationSec], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  let idx = -1
  for (let i = 0; i < screens.length; i++) {
    if (screens[i].t - PRE_SEC <= t) idx = i
  }
  const p =
    idx >= 0
      ? interpolate(t, [screens[idx].t - PRE_SEC, screens[idx].t - PRE_SEC + FADE_SEC], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0
  const e = ease(p)

  const layers: Array<{ screen: LyricScreen; key: number; opacity: number; dy: number }> = []
  if (idx > 0 && e < 1) {
    layers.push({ screen: screens[idx - 1], key: idx - 1, opacity: 1 - e, dy: -12 * u * e })
  }
  if (idx >= 0) {
    layers.push({ screen: screens[idx], key: idx, opacity: e, dy: 16 * u * (1 - e) })
  }

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      {layers.map(({ screen, key, opacity, dy }) =>
        screen.lines.length && opacity * outro > 0.001 ? (
          <div
            key={key}
            style={{
              position: 'absolute',
              left: width * LAYOUT.lyricsCenterX - maxWidth / 2,
              width: maxWidth,
              top: height * LAYOUT.lyricsCenterY,
              display: 'flex',
              justifyContent: 'center',
              transform: `translateY(calc(-50% + ${dy}px))`,
              opacity: opacity * outro,
            }}
          >
            <ScreenBlock screen={screen} u={u} maxWidth={maxWidth} fontReady={fontReady} />
          </div>
        ) : null
      )}
    </AbsoluteFill>
  )
}
