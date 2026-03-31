export interface ChordData {
  frets: number[]
  fingering: string
  barre: boolean
  barreFret?: number
  openStrings: boolean[]
  mutedStrings: boolean[]
}

/** -1 = corda não tocada (X). Ordem das cordas: índice 0 = 6ª (E grave) … 5 = 1ª (E aguda). */
export const CHORDS_DATABASE: Record<string, ChordData> = {
  F: {
    frets: [1, 1, 2, 3, 3, 1],
    fingering: '112341',
    barre: true,
    barreFret: 1,
    openStrings: [false, false, false, false, false, false],
    mutedStrings: [false, false, false, false, false, false]
  },
  Bb: {
    frets: [1, 1, 3, 3, 3, 1],
    fingering: '113331',
    barre: true,
    barreFret: 1,
    openStrings: [false, false, false, false, false, false],
    mutedStrings: [false, false, false, false, false, false]
  },
  /** x32010 — pestana omitida; forma aberta comum. */
  C: {
    frets: [-1, 3, 2, 0, 1, 0],
    fingering: '032010',
    barre: false,
    openStrings: [false, false, false, true, false, true],
    mutedStrings: [true, false, false, false, false, false]
  },
  /** x02210 — dedos explícitos [0,0,2,3,1,0] */
  Am: {
    frets: [-1, 0, 2, 2, 1, 0],
    fingering: '002310',
    barre: false,
    openStrings: [false, true, false, false, false, true],
    mutedStrings: [true, false, false, false, false, false]
  },
  /** xx0231 */
  Dm: {
    frets: [-1, -1, 0, 2, 3, 1],
    fingering: '000132',
    barre: false,
    openStrings: [false, false, true, false, false, false],
    mutedStrings: [true, true, false, false, false, false]
  },
  G7: {
    frets: [3, 2, 0, 0, 0, 1],
    fingering: '320001',
    barre: false,
    openStrings: [false, false, true, true, true, false],
    mutedStrings: [false, false, false, false, false, false]
  },
  G: {
    frets: [3, 2, 0, 0, 3, 3],
    fingering: '320033',
    barre: false,
    openStrings: [false, false, true, true, false, false],
    mutedStrings: [false, false, false, false, false, false]
  },
  /** xx0232 */
  D: {
    frets: [-1, -1, 0, 2, 3, 2],
    fingering: '000123',
    barre: false,
    openStrings: [false, false, true, false, false, false],
    mutedStrings: [true, true, false, false, false, false]
  },
  /** 022000 */
  Em: {
    frets: [0, 2, 2, 0, 0, 0],
    fingering: '023000',
    barre: false,
    openStrings: [true, false, false, true, true, true],
    mutedStrings: [false, false, false, false, false, false]
  },
  E7: {
    frets: [0, 2, 0, 1, 0, 0],
    fingering: '020100',
    barre: false,
    openStrings: [true, false, true, false, true, true],
    mutedStrings: [false, false, false, false, false, false]
  },
  /** x02220 */
  A: {
    frets: [-1, 0, 2, 2, 2, 0],
    fingering: '001230',
    barre: false,
    openStrings: [false, true, false, false, false, true],
    mutedStrings: [true, false, false, false, false, false]
  },
  /** 022100 */
  E: {
    frets: [0, 2, 2, 1, 0, 0],
    fingering: '023100',
    barre: false,
    openStrings: [true, false, false, false, true, true],
    mutedStrings: [false, false, false, false, false, false]
  },
  /** Quintas: só dedos, sem pestana no desenho. */
  A5: {
    frets: [5, 7, 7, -1, -1, -1],
    fingering: '134000',
    barre: false,
    openStrings: [false, false, false, false, false, false],
    mutedStrings: [false, false, false, true, true, true]
  },
  G5: {
    frets: [3, 5, 5, -1, -1, -1],
    fingering: '134000',
    barre: false,
    openStrings: [false, false, false, false, false, false],
    mutedStrings: [false, false, false, true, true, true]
  },
  Bb5: {
    frets: [6, 8, 8, -1, -1, -1],
    fingering: '134000',
    barre: false,
    openStrings: [false, false, false, false, false, false],
    mutedStrings: [false, false, false, true, true, true]
  }
}

export const getChordData = (chordName: string): ChordData | null => {
  return CHORDS_DATABASE[chordName] || null
}
