import React, { useEffect, useState } from 'react'
import {
  AbsoluteFill,
  Audio,
  Img,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

export type ShortLyricLine = {
  t: number
  tEnd?: number
  chordLine: string
  lyric: string
  chords: string[]
}

export type ShortChordMark = {
  t: number
  tEnd?: number
  chord: string
}

export type ShortProps = {
  title: string
  artist: string
  slug: string
  lyricLines: ShortLyricLine[]
  chordMarks: ShortChordMark[]
  diagrams?: string[]
  hasAudio?: boolean
  durationSec?: number
  audioStartSec?: number
  /** Overlay transparente para Premiere (sem fundo / áudio / barra). */
  overlay?: boolean
}

/** Fonte dos textos de cifra no vídeo / overlay Premiere. */
export const CIFRA_VIDEO_FONT = 'Proxima Soft'

let fontPromise: Promise<void> | null = null

function ensureProximaSoft(): Promise<void> {
  if (fontPromise) return fontPromise
  fontPromise = (async () => {
    if (typeof document === 'undefined') return
    // Sem `document.fonts.check`: devolve true quando a fonte nem foi registrada.
    const face = new FontFace(
      CIFRA_VIDEO_FONT,
      `url(${staticFile('fonts/ProximaSoft-Bold.otf')})`,
      { weight: '700', style: 'normal', display: 'swap' }
    )
    const loaded = await face.load()
    document.fonts.add(loaded)
  })()
  return fontPromise
}

function chordFile(chord: string): string {
  const safe = chord.replace(/[^a-zA-Z0-9#b]/g, '_') || 'chord'
  return `short/chords/${safe}.png`
}

function activeIndex(
  items: { t: number; tEnd?: number }[],
  timeSec: number
): number {
  if (!items.length) return 0
  let best = 0
  let bestT = -1
  for (let i = 0; i < items.length; i++) {
    if (items[i].t <= timeSec + 1e-9 && items[i].t > bestT) {
      bestT = items[i].t
      best = i
    }
  }
  return bestT < 0 ? 0 : best
}

/** Destaca o token do acorde ativo (não substring: C não pinta dentro de C4). */
function highlightChordToken(
  chordLine: string,
  activeChord?: string
): React.ReactNode {
  if (!activeChord || !chordLine) return chordLine || ' '
  const tokens = chordLine.split(/(\s+)/)
  let hit = false
  return tokens.map((tok, i) => {
    if (/^\s+$/.test(tok)) return tok
    if (!hit && tok === activeChord) {
      hit = true
      return (
        <span key={`c-${i}`} style={{ color: '#c4b5fd', fontWeight: 700 }}>
          {tok}
        </span>
      )
    }
    return <React.Fragment key={`t-${i}`}>{tok}</React.Fragment>
  })
}

function CifraBlock({
  chordLine,
  lyric,
  active,
  activeChord,
}: {
  chordLine: string
  lyric: string
  active: boolean
  activeChord?: string
}) {
  const chordDisplay: React.ReactNode =
    active && activeChord
      ? highlightChordToken(chordLine, activeChord)
      : chordLine || ' '

  return (
    <div
      style={{
        fontFamily: `"${CIFRA_VIDEO_FONT}", system-ui, sans-serif`,
        fontWeight: 700,
        whiteSpace: 'pre',
        textAlign: 'left',
        opacity: active ? 1 : 0.55,
        transform: active ? 'scale(1)' : 'scale(0.92)',
        transformOrigin: 'left center',
      }}
    >
      <div
        style={{
          fontSize: active ? 36 : 28,
          fontWeight: 700,
          color: active ? '#e9d5ff' : '#a1a1aa',
          lineHeight: 1.15,
          minHeight: active ? 42 : 34,
          textShadow: '0 2px 12px rgba(0,0,0,0.85)',
        }}
      >
        {chordDisplay || ' '}
      </div>
      <div
        style={{
          fontSize: active ? 42 : 30,
          fontWeight: 700,
          color: active ? '#ffffff' : '#d4d4d8',
          lineHeight: 1.2,
          whiteSpace: 'pre-wrap',
          textShadow: '0 2px 14px rgba(0,0,0,0.9)',
        }}
      >
        {lyric}
      </div>
    </div>
  )
}

export function useProximaSoft() {
  const [handle] = useState(() => delayRender('Proxima Soft Bold'))
  useEffect(() => {
    ensureProximaSoft()
      .then(() => continueRender(handle))
      .catch((err) => {
        console.error(err)
        continueRender(handle)
      })
  }, [handle])
}

export const ShortComposition: React.FC<ShortProps> = ({
  lyricLines = [],
  chordMarks = [],
  diagrams = [],
  hasAudio = false,
  durationSec = 45,
  audioStartSec = 0,
  overlay = false,
}) => {
  useProximaSoft()
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const timeSec = frame / fps

  const lyricIdx = activeIndex(lyricLines, timeSec)
  const chordIdx = activeIndex(chordMarks, timeSec)
  const curEv = lyricLines[lyricIdx] ?? {
    t: 0,
    lyric: '',
    chordLine: '',
    chords: [],
  }
  const prevEv = !overlay && lyricIdx > 0 ? lyricLines[lyricIdx - 1] : null
  const diagramChord = chordMarks[chordIdx]?.chord || ''
  const hasDiagram = Boolean(diagramChord && diagrams.includes(diagramChord))
  const audioFrom = Math.max(0, Math.round(audioStartSec * fps))

  const shellStyle: React.CSSProperties = overlay
    ? {
        backgroundColor: 'transparent',
        fontFamily: `"${CIFRA_VIDEO_FONT}", system-ui, sans-serif`,
        fontWeight: 700,
        color: '#fff',
      }
    : {
        backgroundColor: '#1a1028',
        backgroundImage:
          'radial-gradient(ellipse at 30% 20%, #3b1d5c 0%, #1a1028 55%, #0c0814 100%)',
        fontFamily: `"${CIFRA_VIDEO_FONT}", system-ui, sans-serif`,
        fontWeight: 700,
        color: '#fff',
      }

  return (
    <AbsoluteFill style={shellStyle}>
      {!overlay && hasAudio ? (
        <Audio src={staticFile('short/audio.mp3')} startFrom={audioFrom} />
      ) : null}

      {!overlay ? (
        <AbsoluteFill
          style={{
            background:
              'linear-gradient(90deg, rgba(10,6,18,0.55) 0%, rgba(10,6,18,0.25) 55%, rgba(10,6,18,0.45) 100%)',
          }}
        />
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 56,
          right: 420,
          top: 0,
          bottom: 160,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 36,
          paddingRight: 24,
        }}
      >
        {prevEv ? (
          <CifraBlock
            chordLine={prevEv.chordLine}
            lyric={prevEv.lyric}
            active={false}
          />
        ) : overlay ? null : (
          <div style={{ minHeight: 70 }} />
        )}
        <CifraBlock
          chordLine={curEv.chordLine}
          lyric={curEv.lyric}
          active
          activeChord={diagramChord}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          right: 48,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 340,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {diagramChord ? (
          <>
            <div
              style={{
                fontFamily: `"${CIFRA_VIDEO_FONT}", system-ui, sans-serif`,
                fontSize: 40,
                fontWeight: 700,
                color: '#e9d5ff',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              }}
            >
              {diagramChord}
            </div>
            {hasDiagram ? (
              <Img
                src={staticFile(chordFile(diagramChord))}
                style={{
                  width: 300,
                  height: 'auto',
                  borderRadius: 12,
                  backgroundColor: '#fff',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 280,
                  height: 320,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#71717a',
                  fontSize: 22,
                  fontFamily: `"${CIFRA_VIDEO_FONT}", system-ui, sans-serif`,
                  fontWeight: 700,
                }}
              >
                sem diagrama
              </div>
            )}
          </>
        ) : null}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 56,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: `"${CIFRA_VIDEO_FONT}", system-ui, sans-serif`,
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: 'rgba(255,255,255,0.88)',
          textShadow: '0 2px 10px rgba(0,0,0,0.7)',
        }}
      >
        PlayCifras
      </div>

      {!overlay ? (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, (timeSec / Math.max(0.01, durationSec)) * 100)}%`,
              backgroundColor: '#a78bfa',
            }}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  )
}
