import type { ChordDictionary } from '@prisma/client'
import type { ChordPopupDiagramData } from '@/lib/chord-diagram-types'

/**
 * Pestana: se `barre` e `barreFret`, do número de corda mais grave ao mais agudo
 * com `frets[i] === barreFret`.
 * Corda 1 = aguda … N = grave; índice 0 = grave (violão N=6, ukulele N=4).
 */
export function computeBarresFromDictionaryRow(
  frets: number[],
  barre: boolean,
  barreFret: number | null
): NonNullable<ChordPopupDiagramData['barres']> {
  if (!barre || barreFret == null || barreFret <= 0) return []

  const stringCount = frets.length
  const stringNums = frets
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f === barreFret && f > 0)
    .map(({ i }) => stringCount - i)

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
