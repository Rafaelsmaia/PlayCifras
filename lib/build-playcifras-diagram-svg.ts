/**
 * Gera markup SVG do diagrama PlayCifras (espelha PlayCifrasDiagramSvg).
 * Usado por scripts de exportação PNG.
 */

import type { ChordPopupDiagramData } from '@/lib/chord-diagram-types'
import { toReactChordsChord } from '@/lib/chord-react-chords-format'

const LINE = '#222'
const DISPLAY_FRETS = 4

export type BuildPlayCifrasDiagramSvgOptions = {
  chordName: string
  chordData: ChordPopupDiagramData
  size?: 'sm' | 'md' | 'lg'
  fade?: boolean
  embedTitle?: boolean
  titleFontSize?: number
  /** Nome da família para o SVG (ex.: "Nunito"). */
  titleFontFamily?: string
  uid?: string
}

export function buildPlayCifrasDiagramSvg(
  options: BuildPlayCifrasDiagramSvgOptions
): { svg: string; width: number; height: number } {
  const {
    chordName,
    chordData,
    size = 'lg',
    fade = true,
    embedTitle = true,
    titleFontSize = 13,
    titleFontFamily = 'Nunito',
    uid = 'export'
  } = options

  const rc = toReactChordsChord(
    chordData.frets,
    chordData.fingering,
    chordData.barres?.map((b) => b.fret).filter((f) => f > 0) ?? null
  )

  const stringCount =
    chordData.frets.length === 4 || chordData.frets.length === 6
      ? chordData.frets.length
      : 6
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
  const parts: string[] = []

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`
  )
  parts.push(`<rect width="${svgW}" height="${svgH}" fill="#ffffff"/>`)

  if (embedTitle && chordName) {
    const y = titleFs * 0.95 + 4 * scale
    parts.push(
      `<text x="${left + gridW / 2}" y="${y}" text-anchor="middle" font-size="${titleFs}" font-weight="700" fill="${LINE}" font-family="${escapeXml(titleFontFamily)}">${escapeXml(chordName)}</text>`
    )
  }

  if (fade) {
    const span = stringBottom - stringTop
    parts.push('<defs>')
    parts.push(
      `<linearGradient id="${gradId}" x1="0" y1="${stringTop}" x2="0" y2="${stringBottom}" gradientUnits="userSpaceOnUse">`
    )
    if (atNut) {
      parts.push(`<stop offset="0%" stop-color="${LINE}" stop-opacity="1"/>`)
    } else {
      parts.push(`<stop offset="0%" stop-color="${LINE}" stop-opacity="0"/>`)
      parts.push(
        `<stop offset="${((topFadeH * 0.15) / span) * 100}%" stop-color="${LINE}" stop-opacity="0"/>`
      )
      parts.push(
        `<stop offset="${(topFadeH / span) * 100}%" stop-color="${LINE}" stop-opacity="1"/>`
      )
    }
    parts.push(
      `<stop offset="${((gridBottom - stringTop) / span) * 100}%" stop-color="${LINE}" stop-opacity="1"/>`
    )
    parts.push(`<stop offset="100%" stop-color="${LINE}" stop-opacity="0"/>`)
    parts.push('</linearGradient></defs>')
  }

  for (let f = 0; f <= DISPLAY_FRETS; f++) {
    const y = gridTop + f * fretGap
    const isNut = f === 0 && atNut
    if (f === 0 && !atNut && fade) continue
    parts.push(
      `<line x1="${left}" y1="${y}" x2="${left + gridW}" y2="${y}" stroke="${LINE}" stroke-width="${isNut ? 3.5 * scale : 1.15 * scale}" stroke-linecap="square"/>`
    )
  }

  for (let i = 0; i < stringCount; i++) {
    const stroke = fade ? `url(#${gradId})` : LINE
    parts.push(
      `<line x1="${stringX(i)}" y1="${stringTop}" x2="${stringX(i)}" y2="${stringBottom}" stroke="${stroke}" stroke-width="${(1.05 + (stringCount - 1 - i) * 0.12) * scale}" stroke-linecap="butt"/>`
    )
  }

  if (!atNut) {
    parts.push(
      `<text x="${left - 10 * scale}" y="${fretCenterY(1) + 3.5 * scale}" text-anchor="middle" font-size="${11 * scale}" font-weight="700" fill="${LINE}" font-family="sans-serif">${baseFret}ª</text>`
    )
  }

  frets.forEach((f, i) => {
    const x = stringX(i)
    if (f === -1) {
      parts.push(
        `<text x="${x}" y="${statusY}" text-anchor="middle" font-size="${13.5 * scale}" font-weight="700" fill="${LINE}" font-family="sans-serif">×</text>`
      )
      return
    }
    const filled = i === firstPlayed
    parts.push(
      `<circle cx="${x}" cy="${statusY - 3.5 * scale}" r="${3.4 * scale}" fill="${filled ? LINE : 'none'}" stroke="${LINE}" stroke-width="${1.25 * scale}"/>`
    )
  })

  barres.forEach((b) => {
    const y = fretCenterY(b.rel)
    const x1 = stringX(b.fromCol)
    const x2 = stringX(b.toCol)
    parts.push(
      `<rect x="${x1 - rDot}" y="${y - rDot * 0.85}" width="${x2 - x1 + rDot * 2}" height="${rDot * 1.7}" rx="${rDot}" fill="${LINE}"/>`
    )
  })

  frets.forEach((f, i) => {
    if (f <= 0 || f > DISPLAY_FRETS) return
    if (barreCols.has(`${f}:${i}`)) return
    const finger = fingers[i] > 0 ? String(fingers[i]) : ''
    parts.push(
      `<circle cx="${stringX(i)}" cy="${fretCenterY(f)}" r="${rDot}" fill="${LINE}"/>`
    )
    if (finger) {
      parts.push(
        `<text x="${stringX(i)}" y="${fretCenterY(f) + 3.2 * scale}" text-anchor="middle" font-size="${9 * scale}" font-weight="700" fill="#fff" font-family="sans-serif">${finger}</text>`
      )
    }
  })

  parts.push('</svg>')
  return { svg: parts.join(''), width: svgW, height: svgH }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
