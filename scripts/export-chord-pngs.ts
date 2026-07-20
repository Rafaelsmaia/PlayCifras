/**
 * Exporta PNGs de acordes (montador: Nunito + título 24).
 *
 * Uso: npx tsx scripts/export-chord-pngs.ts
 */

import { mkdir, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import {
  resolveGuitarChord,
  guitarChordToDiagramData
} from '../lib/guitar-chord-library'
import { buildPlayCifrasDiagramSvg } from '../lib/build-playcifras-diagram-svg'

const NAMES = [
  'C',
  'Cm',
  'D',
  'Dm',
  'E',
  'Em',
  'F',
  'Fm',
  'G',
  'Gm',
  'A',
  'Am',
  'B',
  'Bm'
] as const

const OUT_DIR = path.join(process.cwd(), 'exports', 'acordes')
const FONT_DIR = path.join(process.cwd(), 'scripts', 'fonts')
const NUNITO_BOLD = path.join(FONT_DIR, 'Nunito-Bold.ttf')
const NUNITO_URL =
  'https://github.com/google/fonts/raw/main/ofl/nunito/Nunito%5Bwght%5D.ttf'

async function ensureNunitoBold(): Promise<string> {
  try {
    await access(NUNITO_BOLD)
    return NUNITO_BOLD
  } catch {
    /* download below */
  }

  await mkdir(FONT_DIR, { recursive: true })
  console.log('Baixando Nunito Bold…')
  const res = await fetch(NUNITO_URL)
  if (!res.ok) {
    throw new Error(`Falha ao baixar Nunito: HTTP ${res.status}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(NUNITO_BOLD, buf)
  return NUNITO_BOLD
}

async function main() {
  const fontPath = await ensureNunitoBold()
  await mkdir(OUT_DIR, { recursive: true })

  for (const name of NAMES) {
    const shape = resolveGuitarChord(name)
    if (!shape) {
      console.error(`✗ ${name}: não encontrado na biblioteca`)
      continue
    }

    const { svg, width, height } = buildPlayCifrasDiagramSvg({
      chordName: name,
      chordData: guitarChordToDiagramData(shape),
      size: 'lg',
      fade: true,
      embedTitle: true,
      titleFontSize: 24,
      titleFontFamily: 'Nunito',
      uid: name.replace(/[^a-zA-Z0-9]/g, '')
    })

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'zoom', value: 3 },
      font: {
        fontFiles: [fontPath],
        loadSystemFonts: true,
        defaultFontFamily: 'Nunito'
      },
      background: '#ffffff'
    })
    const png = resvg.render().asPng()
    const file = path.join(OUT_DIR, `${name}.png`)
    await writeFile(file, png)
    console.log(
      `✓ ${name} (${shape.source}) → ${path.relative(process.cwd(), file)} [${Math.round(width * 3)}×${Math.round(height * 3)}]`
    )
  }

  console.log(`\nPronto: ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
