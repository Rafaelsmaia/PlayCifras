'use client'

import { forwardRef, useId } from 'react'
import type { ChordPopupDiagramData } from '@/lib/chord-diagram-types'
import { toReactChordsChord } from '@/lib/chord-react-chords-format'

export type DiagramInstrument = 'guitar' | 'ukulele'

export type PlayCifrasDiagramSvgProps = {
  chordName: string
  chordData: ChordPopupDiagramData
  /** Escala visual. */
  size?: 'sm' | 'md' | 'lg'
  /** Fade nas pontas das cordas (cifras). No montador / PNG fica false. */
  fade?: boolean
  /** Nome do acorde dentro do SVG (necessário para export PNG). */
  embedTitle?: boolean
  /** Tamanho base do título (antes da escala). Padrão 13. */
  titleFontSize?: number
  /** Família tipográfica do título (CSS font-family). */
  titleFontFamily?: string
  /**
   * Instrumento — define quantidade de cordas se `frets` estiver vazio.
   * Em geral o comprimento de `chordData.frets` manda (6 = violão, 4 = ukulele).
   */
  instrument?: DiagramInstrument
  className?: string
}

const LINE = '#222'
const DISPLAY_FRETS = 4

function resolveStringCount(
  fretsLen: number,
  instrument?: DiagramInstrument
): number {
  if (fretsLen === 4 || fretsLen === 6) return fretsLen
  return instrument === 'ukulele' ? 4 : 6
}

/**
 * SVG do diagrama PlayCifras (estilo Cifra Club).
 * Ref encaminhada para download PNG. Suporta violão (6) e ukulele (4).
 */
const PlayCifrasDiagramSvg = forwardRef<SVGSVGElement, PlayCifrasDiagramSvgProps>(
  function PlayCifrasDiagramSvg(
    {
      chordName,
      chordData,
      size = 'md',
      fade = true,
      embedTitle = false,
      titleFontSize = 13,
      titleFontFamily = 'var(--font-nunito), Nunito, system-ui, sans-serif',
      instrument = 'guitar',
      className
    },
    ref
  ) {
    const uid = useId().replace(/:/g, '')
    const stringCount = resolveStringCount(chordData.frets.length, instrument)

    const rc = toReactChordsChord(
      chordData.frets,
      chordData.fingering,
      chordData.barres?.map((b) => b.fret).filter((f) => f > 0) ?? null
    )

    const frets = rc.frets.slice(0, stringCount)
    const fingers = rc.fingers.slice(0, stringCount)
    const baseFret = rc.baseFret
    const atNut = baseFret <= 1

    const scale = size === 'sm' ? 0.92 : size === 'lg' ? 1.35 : 1
    const left = 22 * scale
    const stringGap = stringCount === 4 ? 18 * scale : 14 * scale
    const fretGap = 19 * scale
    const topFadeH = fade && !atNut ? 12 * scale : 0
    const bottomFadeH = fade ? 16 * scale : 8 * scale
    const statusRowH = 20 * scale
    const titleFs = Math.max(8, titleFontSize) * scale
    const titlePad = embedTitle
      ? Math.max(22 * scale, titleFs * 1.35 + 6 * scale)
      : 4 * scale

    const gridW = stringGap * Math.max(1, stringCount - 1)
    const gridH = fretGap * DISPLAY_FRETS
    const gridTop = titlePad + topFadeH
    const gridBottom = gridTop + gridH
    const stringTop = fade ? gridTop - topFadeH : gridTop
    const stringBottom = fade ? gridBottom + bottomFadeH : gridBottom
    const svgW = left + gridW + 18 * scale
    const svgH = (fade ? stringBottom : gridBottom + bottomFadeH) + statusRowH
    const rDot = 6.6 * scale

    const stringX = (i: number) => left + i * stringGap
    const fretCenterY = (rel: number) => gridTop + (rel - 0.5) * fretGap
    const statusY = (fade ? stringBottom : gridBottom + bottomFadeH) + 14 * scale
    const gradId = `cc-str-${uid}`

    type BarreDraw = { rel: number; fromCol: number; toCol: number }
    const barres: BarreDraw[] = []
    if (chordData.barres?.length) {
      for (const b of chordData.barres) {
        const rel = b.fret - baseFret + 1
        if (rel < 1 || rel > DISPLAY_FRETS) continue
        const c1 = stringCount - b.fromString
        const c2 = stringCount - b.toString
        barres.push({
          rel,
          fromCol: Math.min(c1, c2),
          toCol: Math.max(c1, c2)
        })
      }
    } else if (rc.barres?.length) {
      for (const rel of rc.barres) {
        if (rel < 1 || rel > DISPLAY_FRETS) continue
        let minC = stringCount - 1
        let maxC = 0
        frets.forEach((f, i) => {
          if (f === rel) {
            minC = Math.min(minC, i)
            maxC = Math.max(maxC, i)
          }
        })
        if (maxC > minC) barres.push({ rel, fromCol: minC, toCol: maxC })
      }
    }

    const barreCols = new Set<string>()
    for (const b of barres) {
      for (let c = b.fromCol; c <= b.toCol; c++) barreCols.add(`${b.rel}:${c}`)
    }

    const firstPlayed = frets.findIndex((f) => f !== -1)
    const stringIndices = Array.from({ length: stringCount }, (_, i) => i)

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className={className ?? 'mx-auto block'}
        role="img"
        aria-label={chordName ? `Acorde ${chordName}` : 'Diagrama de acorde'}
      >
        <rect width={svgW} height={svgH} fill="#ffffff" />

        {embedTitle && chordName ? (
          <text
            x={left + gridW / 2}
            y={titleFs * 0.95 + 4 * scale}
            textAnchor="middle"
            fontSize={titleFs}
            fontWeight="700"
            fill={LINE}
            fontFamily={titleFontFamily}
          >
            {chordName}
          </text>
        ) : null}

        {fade ? (
          <defs>
            <linearGradient
              id={gradId}
              x1="0"
              y1={stringTop}
              x2="0"
              y2={stringBottom}
              gradientUnits="userSpaceOnUse"
            >
              {atNut ? (
                <stop offset="0%" stopColor={LINE} stopOpacity="1" />
              ) : (
                <>
                  <stop offset="0%" stopColor={LINE} stopOpacity="0" />
                  <stop
                    offset={`${((topFadeH * 0.15) / (stringBottom - stringTop)) * 100}%`}
                    stopColor={LINE}
                    stopOpacity="0"
                  />
                  <stop
                    offset={`${(topFadeH / (stringBottom - stringTop)) * 100}%`}
                    stopColor={LINE}
                    stopOpacity="1"
                  />
                </>
              )}
              <stop
                offset={`${((gridBottom - stringTop) / (stringBottom - stringTop)) * 100}%`}
                stopColor={LINE}
                stopOpacity="1"
              />
              <stop offset="100%" stopColor={LINE} stopOpacity="0" />
            </linearGradient>
          </defs>
        ) : null}

        {Array.from({ length: DISPLAY_FRETS + 1 }, (_, f) => {
          const y = gridTop + f * fretGap
          const isNut = f === 0 && atNut
          if (f === 0 && !atNut && fade) return null
          return (
            <line
              key={`fret-${f}`}
              x1={left}
              y1={y}
              x2={left + gridW}
              y2={y}
              stroke={LINE}
              strokeWidth={isNut ? 3.5 * scale : 1.15 * scale}
              strokeLinecap="square"
            />
          )
        })}

        {stringIndices.map((i) => (
          <line
            key={`str-${i}`}
            x1={stringX(i)}
            y1={stringTop}
            x2={stringX(i)}
            y2={stringBottom}
            stroke={fade ? `url(#${gradId})` : LINE}
            strokeWidth={
              (1.05 + (stringCount - 1 - i) * 0.12) * scale
            }
            strokeLinecap="butt"
          />
        ))}

        {!atNut && (
          <text
            x={left - 10 * scale}
            y={fretCenterY(1) + 3.5 * scale}
            textAnchor="middle"
            fontSize={11 * scale}
            fontWeight="700"
            fill={LINE}
            fontFamily="system-ui, sans-serif"
          >
            {baseFret}ª
          </text>
        )}

        {frets.map((f, i) => {
          const x = stringX(i)
          if (f === -1) {
            return (
              <text
                key={`mute-${i}`}
                x={x}
                y={statusY}
                textAnchor="middle"
                fontSize={13.5 * scale}
                fontWeight="700"
                fill={LINE}
                fontFamily="system-ui, sans-serif"
              >
                ×
              </text>
            )
          }
          const filled = i === firstPlayed
          return (
            <circle
              key={`open-${i}`}
              cx={x}
              cy={statusY - 3.5 * scale}
              r={3.4 * scale}
              fill={filled ? LINE : 'none'}
              stroke={LINE}
              strokeWidth={1.25 * scale}
            />
          )
        })}

        {barres.map((b, idx) => {
          const y = fretCenterY(b.rel)
          const x1 = stringX(b.fromCol)
          const x2 = stringX(b.toCol)
          return (
            <rect
              key={`barre-${idx}`}
              x={x1 - rDot}
              y={y - rDot * 0.85}
              width={x2 - x1 + rDot * 2}
              height={rDot * 1.7}
              rx={rDot}
              fill={LINE}
            />
          )
        })}

        {frets.map((f, i) => {
          if (f <= 0 || f > DISPLAY_FRETS) return null
          if (barreCols.has(`${f}:${i}`)) return null
          const finger = fingers[i] > 0 ? String(fingers[i]) : ''
          return (
            <g key={`dot-${i}`}>
              <circle cx={stringX(i)} cy={fretCenterY(f)} r={rDot} fill={LINE} />
              {finger ? (
                <text
                  x={stringX(i)}
                  y={fretCenterY(f) + 3.2 * scale}
                  textAnchor="middle"
                  fontSize={9 * scale}
                  fontWeight="700"
                  fill="#fff"
                  fontFamily="system-ui, sans-serif"
                >
                  {finger}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    )
  }
)

export default PlayCifrasDiagramSvg
