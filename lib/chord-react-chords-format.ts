/**
 * Converte dados do ChordDictionary para @tombatossals/react-chords.
 * frets[0]…[5] = E grave → e aguda.
 */

export type ReactChordsChord = {
  frets: number[]
  fingers: number[]
  barres: number[]
  capo: boolean
  baseFret: number
}

function relativeSlice(absFrets: number[], baseFret: number): number[] {
  return absFrets.map((f) => {
    if (f <= 0) return f
    return f - baseFret + 1
  })
}

function computeBaseAndRel(absFrets: number[]): { baseFret: number; rel: number[] } {
  const pos = absFrets.filter((f) => f > 0)
  if (!pos.length) {
    return { baseFret: 1, rel: absFrets }
  }
  const minF = Math.min(...pos)
  const maxF = Math.max(...pos)
  const span = maxF - minF + 1

  /**
   * Trastes absolutos 1–4: sempre janela a partir do nut (baseFret = 1).
   * Acima da 4ª casa com extensão ≤ 4: janela a partir do traste mais grave (ex.: G5 em 3–5 → "3fr").
   * Caso contrário: deslizar (ex.: pestanas altas).
   */
  let baseFret = 1
  if (maxF <= 4) {
    baseFret = 1
  } else if (span <= 4) {
    baseFret = minF
  } else {
    baseFret = Math.max(1, maxF - 3)
  }

  let rel = relativeSlice(absFrets, baseFret)
  let maxRel = Math.max(0, ...rel.filter((f) => f > 0))
  while (maxRel > 5 && baseFret < maxF) {
    baseFret += 1
    rel = relativeSlice(absFrets, baseFret)
    maxRel = Math.max(0, ...rel.filter((f) => f > 0))
  }
  return { baseFret, rel }
}

export function toReactChordsChord(
  absFrets: number[],
  fingers: number[],
  barreAbsoluteFrets: number[] | null
): ReactChordsChord {
  const { baseFret, rel } = computeBaseAndRel(absFrets)

  const barres: number[] = []
  for (const abs of barreAbsoluteFrets ?? []) {
    const r = abs - baseFret + 1
    if (r >= 1 && r <= 5 && rel.some((f) => f === r)) {
      barres.push(r)
    }
  }
  const barresUnique = Array.from(new Set(barres))

  return {
    frets: rel,
    fingers: fingers.map((n) => Math.min(5, Math.max(0, n))),
    barres: barresUnique,
    capo: false,
    baseFret
  }
}
