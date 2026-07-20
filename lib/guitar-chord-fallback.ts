import type { GuitarChordShape } from '@/data/guitar-chords'

/**
 * Fallback de pestana / power — só usado quando o nome NÃO está em CURATED_GUITAR_CHORDS.
 * Não é fonte da verdade; digitações preferidas vivem em data/guitar-chords.ts.
 */

const NOTE_CHROMA: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11
}

function noteChroma(note: string): number {
  return NOTE_CHROMA[note] ?? NaN
}

const ROOTS = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B'
] as const

/** Shapes de referência em F (pestana no 1º traste) — E-shape. */
const BARRE_MASTERS = {
  major: { frets: [1, 3, 3, 2, 1, 1], fingering: [1, 3, 4, 2, 1, 1] },
  minor: { frets: [1, 3, 3, 1, 1, 1], fingering: [1, 3, 4, 1, 1, 1] },
  dom7: { frets: [1, 3, 1, 2, 1, 1], fingering: [1, 3, 1, 2, 1, 1] },
  maj7: { frets: [1, 3, 2, 2, 1, 1], fingering: [1, 3, 2, 2, 1, 1] },
  m7: { frets: [1, 3, 1, 1, 1, 1], fingering: [1, 3, 1, 1, 1, 1] },
  sus4: { frets: [1, 3, 3, 3, 1, 1], fingering: [1, 3, 3, 4, 1, 1] },
  dim: { frets: [1, 2, 3, 1, 3, 1], fingering: [1, 2, 4, 1, 3, 1] },
  aug: { frets: [1, 4, 3, 2, 2, 1], fingering: [1, 4, 3, 2, 2, 1] }
} as const

type BarreKind = keyof typeof BARRE_MASTERS

/** Sufixos BR (e aliases) produzidos pelo fallback. */
const KIND_SUFFIXES: Record<BarreKind, string[]> = {
  major: [''],
  minor: ['m'],
  dom7: ['7'],
  maj7: ['7M', 'maj7'],
  m7: ['m7'],
  sus4: ['sus4'],
  dim: ['dim'],
  aug: ['aug']
}

const POWER5_REF = {
  tonic: 'G',
  frets: [3, 5, 5, -1, -1, -1] as number[],
  fingering: [1, 3, 4, 0, 0, 0] as number[]
}

function transposeFrets(
  refTonic: string,
  targetTonic: string,
  frets: number[]
): number[] {
  let d = noteChroma(targetTonic) - noteChroma(refTonic)
  if (Number.isNaN(d)) return [...frets]
  // Sobe uma oitava se a pestana cair abaixo da 1ª casa (ex.: C a partir de F).
  if (d < 0) d += 12
  return frets.map((f) => (f <= 0 ? f : Math.min(12, f + d)))
}

function barreShapeForRoot(
  root: string,
  kind: BarreKind
): GuitarChordShape | null {
  const master = BARRE_MASTERS[kind]
  const frets = transposeFrets('F', root, [...master.frets])
  const positives = frets.filter((f) => f > 0)
  if (positives.length === 0) return null
  const barreFret = Math.min(...positives)
  return {
    frets,
    fingering: [...master.fingering],
    barre: true,
    barreFret
  }
}

/** Mapa nome → shape gerado (sem sobrescrever curados — quem chama filtra). */
export function buildBarreFallbackMap(): Record<string, GuitarChordShape> {
  const out: Record<string, GuitarChordShape> = {}

  for (const root of ROOTS) {
    for (const kind of Object.keys(BARRE_MASTERS) as BarreKind[]) {
      const shape = barreShapeForRoot(root, kind)
      if (!shape) continue
      for (const suffix of KIND_SUFFIXES[kind]) {
        const name = `${root}${suffix}`
        if (!(name in out)) out[name] = shape
      }
    }

    const frets5 = transposeFrets(POWER5_REF.tonic, root, [...POWER5_REF.frets])
    const name5 = `${root}5`
    if (!(name5 in out)) {
      out[name5] = {
        frets: frets5,
        fingering: [...POWER5_REF.fingering],
        barre: false,
        barreFret: null
      }
    }
  }

  return out
}
