import 'server-only'

import type { ChordPopupDiagramData } from '@/lib/chord-diagram-types'
import { chordDiagramsFromLibrary } from '@/lib/guitar-chord-library'

/**
 * Resolve nomes de acordes para diagramas.
 * Fonte: biblioteca própria (data/guitar-chords.ts + fallback), não o Postgres.
 */
export async function chordDiagramsForChordNames(
  names: string[],
  _instrument = 'guitar'
): Promise<Record<string, ChordPopupDiagramData>> {
  return chordDiagramsFromLibrary(names)
}
