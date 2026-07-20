/**
 * Biblioteca própria de acordes de violão (fonte da verdade).
 *
 * Edite aqui as digitações preferidas (estilo Cifra Club / violão popular BR).
 * O runtime resolve por este arquivo; pestana gerada só entra como fallback
 * quando o nome não está curado — ver lib/guitar-chord-library.ts.
 *
 * Convenção de frets: índice 0 = 6ª corda (E grave) … 5 = 1ª (E aguda).
 * -1 = muda (X), 0 = solta (O).
 */

export type GuitarChordShape = {
  frets: number[]
  /** Dedo por corda: 0 = nenhum (solta/muda), 1–4 = dedo. */
  fingering: number[]
  barre: boolean
  barreFret: number | null
}

function chord(
  frets: number[],
  fingering: string | number[],
  options?: { barre?: boolean; barreFret?: number | null }
): GuitarChordShape {
  const fing =
    typeof fingering === 'string'
      ? fingering
          .padEnd(6, '0')
          .slice(0, 6)
          .split('')
          .map((c) => parseInt(c, 10) || 0)
      : fingering
  return {
    frets,
    fingering: fing,
    barre: options?.barre ?? false,
    barreFret: options?.barreFret ?? null
  }
}

/**
 * Digitações curadas. Se um nome existir aqui, nunca deve ser substituído
 * por fallback de pestana.
 */
export const CURATED_GUITAR_CHORDS: Record<string, GuitarChordShape> = {
  // --- abertos / básicos ---
  C: chord([-1, 3, 2, 0, 1, 0], '032010'),
  Cm: chord([-1, 3, 5, 5, 4, 3], '013421', { barre: true, barreFret: 3 }),
  D: chord([-1, -1, 0, 2, 3, 2], '000123'),
  E: chord([0, 2, 2, 1, 0, 0], '023100'),
  G: chord([3, 2, 0, 0, 3, 3], '320033'),
  A: chord([-1, 0, 2, 2, 2, 0], '001230'),
  Am: chord([-1, 0, 2, 2, 1, 0], '002310'),
  Dm: chord([-1, -1, 0, 2, 3, 1], '000132'),
  Em: chord([0, 2, 2, 0, 0, 0], '023000'),
  Bm: chord([-1, 2, 4, 4, 3, 2], '013421', { barre: true, barreFret: 2 }),

  F: chord([1, 3, 3, 2, 1, 1], '133211', { barre: true, barreFret: 1 }),
  Bb: chord([1, 1, 3, 3, 3, 1], '113331', { barre: true, barreFret: 1 }),

  // --- sétimas abertas (populares) ---
  A7: chord([-1, 0, 2, 0, 2, 0], '001020'),
  B7: chord([-1, 2, 1, 2, 0, 2], '021303'),
  C7: chord([-1, 3, 2, 3, 1, 0], '032410'),
  D7: chord([-1, -1, 0, 2, 1, 2], '000213'),
  E7: chord([0, 2, 0, 1, 0, 0], '020100'),
  G7: chord([3, 2, 0, 0, 0, 1], '320001'),

  // --- m7 / 7M (causa do bug Tempo Perdido) ---
  Am7: chord([-1, 0, 2, 0, 1, 0], '002010'),
  Bm7: chord([-1, 2, 0, 2, 0, 2], '010203'),
  Cm7: chord([-1, 3, 5, 3, 4, 3], '013121', { barre: true, barreFret: 3 }),
  Dm7: chord([-1, -1, 0, 2, 1, 1], '000211'),
  Em7: chord([0, 2, 0, 0, 0, 0], '020000'),
  Fm7: chord([1, 3, 1, 1, 1, 1], '131111', { barre: true, barreFret: 1 }),
  Gm7: chord([3, 5, 3, 3, 3, 3], '131111', { barre: true, barreFret: 3 }),

  C7M: chord([-1, 3, 2, 0, 0, 0], '032000'),
  Cmaj7: chord([-1, 3, 2, 0, 0, 0], '032000'),
  D7M: chord([-1, -1, 0, 2, 2, 2], '000111'),
  Dmaj7: chord([-1, -1, 0, 2, 2, 2], '000111'),
  E7M: chord([0, 2, 1, 1, 0, 0], '021100'),
  F7M: chord([1, 3, 2, 2, 1, 0], '132210'),
  Fmaj7: chord([1, 3, 2, 2, 1, 0], '132210'),
  G7M: chord([3, 2, 0, 0, 0, 2], '320002'),
  A7M: chord([-1, 0, 2, 1, 2, 0], '002130'),
  Amaj7: chord([-1, 0, 2, 1, 2, 0], '002130'),
  B7M: chord([-1, 2, 4, 3, 4, 2], '013241', { barre: true, barreFret: 2 }),

  // --- sus / add comuns ---
  Dsus4: chord([-1, -1, 0, 2, 3, 3], '000134'),
  Asus4: chord([-1, 0, 2, 2, 3, 0], '001230'),
  Esus4: chord([0, 2, 2, 2, 0, 0], '023400'),
  Cadd9: chord([-1, 3, 2, 0, 3, 0], '032040'),

  // --- quintas ---
  A5: chord([5, 7, 7, -1, -1, -1], '134000'),
  G5: chord([3, 5, 5, -1, -1, -1], '134000'),
  Bb5: chord([6, 8, 8, -1, -1, -1], '134000'),
  C5: chord([8, 10, 10, -1, -1, -1], '134000'),
  D5: chord([10, 12, 12, -1, -1, -1], '134000'),
  E5: chord([0, 2, 2, -1, -1, -1], '023000'),
  F5: chord([1, 3, 3, -1, -1, -1], '134000')
}
