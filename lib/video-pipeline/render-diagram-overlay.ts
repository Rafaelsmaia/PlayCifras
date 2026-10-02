/**
 * Overlay ProRes 4444 (alpha) com a troca animada de diagramas,
 * cronometrada pelos marcadores do Premiere.
 */
import 'server-only'

import { access, mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import type { ChordPopupDiagramData } from '@/lib/chord-diagram-types'
import { chordDiagramsForChordNames } from '@/lib/chord-dictionary-batch'
import { toReactChordsChord } from '@/lib/chord-react-chords-format'
import type {
  DiagramOverlayProps,
  DiagramShape,
} from '@/video-shorts/src/diagram-overlay-types'

/** Mude quando o visual da composição mudar (invalida o cache). */
const RENDER_VERSION = 2
/** Tempo antes do 1º marcador para o card entrar. */
export const DIAGRAM_LEAD_IN_SEC = 0.6
const DISPLAY_FRETS = 4
const STRINGS = 6

export type DiagramOverlayInput = {
  /** Tempos absolutos da sequência (segundos). */
  marks: Array<{ t: number; chord: string }>
  endSec: number
  fps?: number
  slug?: string
  force?: boolean
}

export type DiagramOverlayResult = {
  overlayPath: string
  fileName: string
  /** Onde colocar o clipe na sequência (segundos). */
  startSec: number
  durationSec: number
  cached: boolean
  missingChords: string[]
}

function toShape(data: ChordPopupDiagramData): DiagramShape | null {
  if (data.frets.length !== STRINGS) return null
  const rc = toReactChordsChord(
    data.frets,
    data.fingering,
    data.barres?.map((b) => b.fret).filter((f) => f > 0) ?? null
  )
  const frets = rc.frets.slice(0, STRINGS)

  const barres: DiagramShape['barres'] = []
  if (data.barres?.length) {
    for (const b of data.barres) {
      const rel = b.fret - rc.baseFret + 1
      if (rel < 1 || rel > DISPLAY_FRETS) continue
      const c1 = STRINGS - b.fromString
      const c2 = STRINGS - b.toString
      barres.push({ rel, fromCol: Math.min(c1, c2), toCol: Math.max(c1, c2) })
    }
  } else {
    for (const rel of rc.barres) {
      const cols = frets
        .map((f, i) => (f === rel ? i : -1))
        .filter((i) => i >= 0)
      if (cols.length > 1) {
        barres.push({ rel, fromCol: cols[0], toCol: cols[cols.length - 1] })
      }
    }
  }

  return {
    frets,
    fingers: rc.fingers.slice(0, STRINGS),
    baseFret: rc.baseFret,
    barres,
  }
}

function safeSlug(s: string) {
  return s.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || 'diagramas'
}

async function exists(p: string) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

export async function renderDiagramOverlay(
  input: DiagramOverlayInput
): Promise<DiagramOverlayResult> {
  const fps = Math.min(60, Math.max(12, Math.round(input.fps || 30)))
  const marks = input.marks
    .map((m) => ({ t: Number(m.t), chord: String(m.chord || '').trim() }))
    .filter((m) => Number.isFinite(m.t) && m.chord)
    .sort((a, b) => a.t - b.t)
  if (!marks.length) throw new Error('Nenhum marcador com acorde')

  const startSec = Math.max(0, marks[0].t - DIAGRAM_LEAD_IN_SEC)
  const relMarks = marks.map((m) => ({
    t: Math.round((m.t - startSec) * 1000) / 1000,
    chord: m.chord,
  }))
  const lastRel = relMarks[relMarks.length - 1].t
  const durationSec =
    Math.round(Math.max(Number(input.endSec) - startSec, lastRel + 1) * 1000) / 1000

  const uniqueChords = Array.from(new Set(marks.map((m) => m.chord)))
  const diagrams = await chordDiagramsForChordNames(uniqueChords, 'guitar')
  const shapes: Record<string, DiagramShape> = {}
  const missingChords: string[] = []
  for (const chord of uniqueChords) {
    const shape = diagrams[chord] ? toShape(diagrams[chord]) : null
    if (shape) shapes[chord] = shape
    else missingChords.push(chord)
  }

  const props: DiagramOverlayProps = { marks: relMarks, shapes, durationSec, fps }
  const hash = createHash('sha1')
    .update(JSON.stringify({ v: RENDER_VERSION, props }))
    .digest('hex')
    .slice(0, 10)

  const dir = path.join(process.cwd(), 'exports', 'diagram-overlays')
  await mkdir(dir, { recursive: true })
  const baseName = `${safeSlug(input.slug || 'diagramas')}-${hash}`
  const fileName = `${baseName}.mov`
  const overlayPath = path.join(dir, fileName)
  const propsPath = path.join(dir, `${baseName}.json`)

  const result = { overlayPath, fileName, startSec, durationSec, missingChords }
  if (!input.force && (await exists(overlayPath)) && (await stat(overlayPath)).size) {
    return { ...result, cached: true }
  }

  await writeFile(propsPath, JSON.stringify(props), 'utf8')

  const code: number = await new Promise((resolve) => {
    const child = spawn(
      'npx',
      [
        'remotion',
        'render',
        'src/index.ts',
        'DiagramOverlay',
        `"${overlayPath}"`,
        `"--props=${propsPath}"`,
        '--codec=prores',
        '--prores-profile=4444',
        '--image-format=png',
        '--pixel-format=yuva444p10le',
        '--muted',
        '--overwrite',
      ],
      {
        cwd: path.join(process.cwd(), 'video-shorts'),
        stdio: 'inherit',
        shell: true,
      }
    )
    child.on('close', (c) => resolve(c ?? 1))
  })

  if (code !== 0) throw new Error(`Remotion falhou (exit ${code})`)
  if (!(await stat(overlayPath)).size) throw new Error('Overlay vazio')

  return { ...result, cached: false }
}
