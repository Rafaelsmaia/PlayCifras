import type { ChordPopupDiagramData } from '@/components/ChordPopup'
import { prisma } from '@/lib/database'
import { chordDictionaryToDiagramData } from '@/lib/chord-dictionary-mapper'
import { chordLookupKeys } from '@/lib/chord-normalize'

/** Resolve nomes de acordes para dados de diagrama (mesma lógica do POST /api/chords/dictionary/batch). */
export async function chordDiagramsForChordNames(
  names: string[],
  instrument = 'guitar'
): Promise<Record<string, ChordPopupDiagramData>> {
  const unique = Array.from(
    new Set(names.map((n) => String(n).trim()).filter(Boolean))
  )
  if (unique.length === 0) return {}

  const queryNames = new Set<string>()
  for (const n of unique) {
    for (const k of chordLookupKeys(n)) queryNames.add(k)
  }

  const rows = await prisma.chordDictionary.findMany({
    where: {
      instrument,
      name: { in: Array.from(queryNames) }
    }
  })

  const byDbName = new Map(rows.map((r) => [r.name, r]))

  const chords: Record<string, ChordPopupDiagramData> = {}
  for (const requested of unique) {
    let row = byDbName.get(requested)
    if (!row) {
      for (const k of chordLookupKeys(requested)) {
        row = byDbName.get(k)
        if (row) break
      }
    }
    if (row) chords[requested] = chordDictionaryToDiagramData(row)
  }
  return chords
}
