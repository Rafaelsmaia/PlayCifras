/**
 * Compat: legada OptimizedChordDiagram.
 * Fonte da verdade: data/guitar-chords.ts
 */
import {
  CURATED_GUITAR_CHORDS,
  type GuitarChordShape
} from '@/data/guitar-chords'
import { resolveGuitarChord } from '@/lib/guitar-chord-library'

export type ChordData = {
  frets: number[]
  fingering: string
  barre: boolean
  barreFret?: number
  openStrings: boolean[]
  mutedStrings: boolean[]
}

function toChordData(shape: GuitarChordShape): ChordData {
  return {
    frets: shape.frets,
    fingering: shape.fingering.map(String).join('').padEnd(6, '0').slice(0, 6),
    barre: shape.barre,
    barreFret: shape.barreFret ?? undefined,
    openStrings: shape.frets.map((f) => f === 0),
    mutedStrings: shape.frets.map((f) => f < 0)
  }
}

/** @deprecated Use CURATED_GUITAR_CHORDS / resolveGuitarChord */
export const CHORDS_DATABASE: Record<string, ChordData> = Object.fromEntries(
  Object.entries(CURATED_GUITAR_CHORDS).map(([name, shape]) => [
    name,
    toChordData(shape)
  ])
)

export const getChordData = (chordName: string): ChordData | null => {
  const resolved = resolveGuitarChord(chordName)
  return resolved ? toChordData(resolved) : null
}
