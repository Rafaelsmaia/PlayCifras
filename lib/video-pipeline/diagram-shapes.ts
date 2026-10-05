import type { ChordPopupDiagramData } from '@/lib/chord-diagram-types'
import { chordDiagramsFromLibrary } from '@/lib/guitar-chord-library'
import { toReactChordsChord } from '@/lib/chord-react-chords-format'
import type { DiagramShape } from '@/video-shorts/src/diagram-overlay-types'

const DISPLAY_FRETS = 4
const STRINGS = 6

/** Digitação da biblioteca → forma pronta para a composição Remotion (janela de 4 casas). */
export function toDiagramShape(data: ChordPopupDiagramData): DiagramShape | null {
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

export function diagramShapesForChords(chords: string[]): {
  shapes: Record<string, DiagramShape>
  missing: string[]
} {
  const unique = Array.from(new Set(chords.map((c) => String(c).trim()).filter(Boolean)))
  const diagrams = chordDiagramsFromLibrary(unique)
  const shapes: Record<string, DiagramShape> = {}
  const missing: string[] = []
  for (const chord of unique) {
    const shape = diagrams[chord] ? toDiagramShape(diagrams[chord]) : null
    if (shape) shapes[chord] = shape
    else missing.push(chord)
  }
  return { shapes, missing }
}
