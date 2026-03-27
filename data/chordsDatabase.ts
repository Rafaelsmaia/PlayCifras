export interface ChordData {
  frets: number[]
  fingering: string
  barre: boolean
  barreFret?: number
  openStrings: boolean[]
  mutedStrings: boolean[]
}

export const CHORDS_DATABASE: Record<string, ChordData> = {
  'F': {
    frets: [1, 1, 2, 2, 1, 1],
    fingering: '112211',
    barre: true,
    barreFret: 1,
    openStrings: [false, false, false, false, false, false],
    mutedStrings: [false, false, false, false, false, false]
  },
  'Bb': {
    frets: [1, 1, 3, 3, 3, 1],
    fingering: '113331',
    barre: true,
    barreFret: 1,
    openStrings: [false, false, false, false, false, false],
    mutedStrings: [false, false, false, false, false, false]
  },
  'C': {
    frets: [0, 3, 2, 0, 1, 0],
    fingering: '032010',
    barre: false,
    openStrings: [true, false, false, true, false, true],
    mutedStrings: [false, false, false, false, false, false]
  },
  'Am': {
    frets: [0, 0, 2, 2, 1, 0],
    fingering: '002210',
    barre: false,
    openStrings: [true, true, false, false, false, true],
    mutedStrings: [false, false, false, false, false, false]
  },
  'Dm': {
    frets: [0, 0, 0, 2, 3, 1],
    fingering: '000231',
    barre: false,
    openStrings: [true, true, true, false, false, false],
    mutedStrings: [false, false, false, false, false, false]
  },
  'G7': {
    frets: [3, 2, 0, 0, 0, 1],
    fingering: '320001',
    barre: false,
    openStrings: [false, false, true, true, true, false],
    mutedStrings: [false, false, false, false, false, false]
  },
  'G': {
    frets: [3, 2, 0, 0, 3, 3],
    fingering: '320033',
    barre: false,
    openStrings: [false, false, true, true, false, false],
    mutedStrings: [false, false, false, false, false, false]
  },
  'D': {
    frets: [0, 0, 0, 2, 3, 2],
    fingering: '000232',
    barre: false,
    openStrings: [true, true, true, false, false, false],
    mutedStrings: [false, false, false, false, false, false]
  },
  'Em': {
    frets: [0, 0, 0, 2, 2, 0],
    fingering: '000220',
    barre: false,
    openStrings: [true, true, true, false, false, true],
    mutedStrings: [false, false, false, false, false, false]
  },
  'E7': {
    frets: [0, 2, 0, 1, 0, 0],
    fingering: '020100',
    barre: false,
    openStrings: [true, false, true, false, true, true],
    mutedStrings: [false, false, false, false, false, false]
  }
}

export const getChordData = (chordName: string): ChordData | null => {
  return CHORDS_DATABASE[chordName] || null
}
