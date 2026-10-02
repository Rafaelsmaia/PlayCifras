/**
 * Exporta PNGs dos acordes usados em um short.
 */
import { mkdir, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import {
  resolveGuitarChord,
  guitarChordToDiagramData,
} from '../../lib/guitar-chord-library'
import { buildPlayCifrasDiagramSvg } from '../../lib/build-playcifras-diagram-svg'

const FONT_DIR = path.join(process.cwd(), 'scripts', 'fonts')
const NUNITO_BOLD = path.join(FONT_DIR, 'Nunito-Bold.ttf')
const NUNITO_URL =
  'https://github.com/google/fonts/raw/main/ofl/nunito/Nunito%5Bwght%5D.ttf'

async function ensureNunitoBold(): Promise<string> {
  try {
    await access(NUNITO_BOLD)
    return NUNITO_BOLD
  } catch {
    /* download */
  }
  await mkdir(FONT_DIR, { recursive: true })
  const res = await fetch(NUNITO_URL)
  if (!res.ok) throw new Error(`Falha ao baixar Nunito: HTTP ${res.status}`)
  await writeFile(NUNITO_BOLD, Buffer.from(await res.arrayBuffer()))
  return NUNITO_BOLD
}

function safeFileName(chord: string): string {
  return chord.replace(/[^a-zA-Z0-9#b]/g, '_') || 'chord'
}

export async function exportChordPngs(
  chordNames: string[],
  outDir: string
): Promise<string[]> {
  const fontPath = await ensureNunitoBold()
  await mkdir(outDir, { recursive: true })
  const exported: string[] = []

  for (const name of chordNames) {
    const shape = resolveGuitarChord(name)
    if (!shape) {
      console.warn(`  ⚠ acorde sem diagrama: ${name}`)
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
      uid: safeFileName(name),
    })
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'zoom', value: 3 },
      font: {
        fontFiles: [fontPath],
        loadSystemFonts: true,
        defaultFontFamily: 'Nunito',
      },
      background: '#ffffff',
    })
    const file = path.join(outDir, `${safeFileName(name)}.png`)
    await writeFile(file, resvg.render().asPng())
    exported.push(name)
    console.log(
      `  ✓ ${name} → ${path.relative(process.cwd(), file)} [${Math.round(width * 3)}×${Math.round(height * 3)}]`
    )
  }
  return exported
}

export function chordPngFileName(chord: string): string {
  return `${safeFileName(chord)}.png`
}
