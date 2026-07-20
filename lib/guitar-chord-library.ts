import {
  CURATED_GUITAR_CHORDS,
  type GuitarChordShape
} from '@/data/guitar-chords'
import { buildBarreFallbackMap } from '@/lib/guitar-chord-fallback'
import type { ChordPopupDiagramData } from '@/lib/chord-diagram-types'
import { computeBarresFromDictionaryRow } from '@/lib/chord-dictionary-mapper'
import { chordLookupKeys } from '@/lib/chord-normalize'

export type ResolvedGuitarChord = GuitarChordShape & {
  source: 'curated' | 'fallback'
}

let cachedLibrary: Record<string, ResolvedGuitarChord> | null = null

/**
 * Biblioteca completa em memória: curados + fallback de pestana só para nomes
 * que ainda não existem no curado.
 */
export function getGuitarChordLibrary(): Record<string, ResolvedGuitarChord> {
  if (cachedLibrary) return cachedLibrary

  const library: Record<string, ResolvedGuitarChord> = {}

  for (const [name, shape] of Object.entries(CURATED_GUITAR_CHORDS)) {
    library[name] = { ...shape, source: 'curated' }
  }

  const fallbacks = buildBarreFallbackMap()
  for (const [name, shape] of Object.entries(fallbacks)) {
    if (name in library) continue
    library[name] = { ...shape, source: 'fallback' }
  }

  cachedLibrary = library
  return library
}

/** Base do acorde (remove baixo /C#, etc.). */
export function chordBaseName(name: string): string {
  const n = name.trim()
  const slash = n.indexOf('/')
  return slash === -1 ? n : n.slice(0, slash)
}

export function resolveGuitarChord(
  name: string
): ResolvedGuitarChord | null {
  const library = getGuitarChordLibrary()
  const base = chordBaseName(name)

  for (const key of chordLookupKeys(base)) {
    const hit = library[key]
    if (hit) return hit
  }
  return null
}

export function guitarChordToDiagramData(
  shape: GuitarChordShape
): ChordPopupDiagramData {
  return {
    frets: shape.frets,
    fingering: shape.fingering,
    barres: computeBarresFromDictionaryRow(
      shape.frets,
      shape.barre,
      shape.barreFret
    )
  }
}

/** Resolve vários nomes → dados de diagrama (uso na página da cifra / API). */
export function chordDiagramsFromLibrary(
  names: string[]
): Record<string, ChordPopupDiagramData> {
  const out: Record<string, ChordPopupDiagramData> = {}
  for (const raw of names) {
    const name = String(raw).trim()
    if (!name) continue
    const shape = resolveGuitarChord(name)
    if (shape) out[name] = guitarChordToDiagramData(shape)
  }
  return out
}

export function listLibraryEntries(): Array<{
  name: string
  source: 'curated' | 'fallback'
  shape: GuitarChordShape
}> {
  return Object.entries(getGuitarChordLibrary()).map(([name, resolved]) => ({
    name,
    source: resolved.source,
    shape: {
      frets: resolved.frets,
      fingering: resolved.fingering,
      barre: resolved.barre,
      barreFret: resolved.barreFret
    }
  }))
}
