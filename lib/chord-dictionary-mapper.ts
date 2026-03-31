import type { ChordDictionary } from '@prisma/client'
import type { ChordPopupDiagramData } from '@/components/ChordPopup'

/** Corda 1 = aguda … 6 = grave; índice 0 = grave. */
function stringNumberFromDataIndex(i: number): number {
  return 6 - i
}

/**
 * Pestana: se `barre` e `barreFret`, do número de corda mais grave ao mais agudo
 * com `frets[i] === barreFret`.
 */
export function computeBarresFromDictionaryRow(
  frets: number[],
  barre: boolean,
  barreFret: number | null
): NonNullable<ChordPopupDiagramData['barres']> {
  if (!barre || barreFret == null || barreFret <= 0) return []

  const stringNums = frets
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f === barreFret && f > 0)
    .map(({ i }) => stringNumberFromDataIndex(i))

  if (stringNums.length < 2) return []

  return [
    {
      fromString: Math.min(...stringNums),
      toString: Math.max(...stringNums),
      fret: barreFret
    }
  ]
}

export function chordDictionaryToDiagramData(
  row: Pick<
    ChordDictionary,
    'frets' | 'fingering' | 'barre' | 'barreFret'
  >
): ChordPopupDiagramData {
  const frets = JSON.parse(row.frets) as number[]
  const fingering = JSON.parse(row.fingering) as number[]
  return {
    frets,
    fingering,
    barres: computeBarresFromDictionaryRow(frets, row.barre, row.barreFret)
  }
}
