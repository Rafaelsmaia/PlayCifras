/**
 * Importa acordes para ChordDictionary (violão/guitarra).
 * Usa @tonaljs/chord + shapes barra transpostos + quintas (power) + data/chordsDatabase.ts.
 *
 *   npx tsx scripts/import-chords.ts
 *   npx tsx scripts/import-chords.ts --reset   # apaga todo o dicionário antes (reimport limpo)
 */
import { PrismaClient } from '@prisma/client'
import { getChord } from '@tonaljs/chord'
import { chroma } from '@tonaljs/note'
import { tonalMajorSymbolToLyricName } from '../lib/chord-normalize'
import { CHORDS_DATABASE, type ChordData } from '../data/chordsDatabase'

const prisma = new PrismaClient()

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

export type ChordSeedEntry = {
  name: string
  frets: number[]
  fingering: number[]
  barre: boolean
  barreFret: number | null
}

function fingeringStringToArray(s: string): number[] {
  const pad = s.padEnd(6, '0').slice(0, 6)
  return pad.split('').map((c) => parseInt(c, 10) || 0)
}

function chordDataToEntry(name: string, c: ChordData): ChordSeedEntry {
  return {
    name,
    frets: [...c.frets],
    fingering: fingeringStringToArray(c.fingering),
    barre: c.barre,
    barreFret: c.barreFret ?? null
  }
}

function chordNameFromTonal(ch: { symbol: string; empty: boolean }): string | null {
  if (ch.empty || !ch.symbol) return null
  return tonalMajorSymbolToLyricName(ch.symbol.replace(/\s/g, ''))
}

/**
 * Transpõe shapes com pestana. `refBarreFret` é o traste da pestana na forma de referência
 * (ex.: 1 em formas em F; 7 em A5). Se `null`, usa o menor traste pressionado (fallback).
 */
function transposeBarre(
  refTonic: string,
  targetTonic: string,
  frets: number[],
  fingering: number[],
  refBarreFret: number | null
): { frets: number[]; fingering: number[]; barreFret: number | null } {
  const d = chroma(targetTonic) - chroma(refTonic)
  if (Number.isNaN(d)) {
    return { frets, fingering, barreFret: null }
  }
  const nf = frets.map((f) => (f <= 0 ? f : Math.min(12, f + d)))
  const ni = [...fingering]
  const positives = nf.filter((f) => f > 0)

  let barreFret: number | null
  if (refBarreFret != null) {
    const next = refBarreFret + d
    barreFret = next >= 1 && next <= 12 ? next : positives.length ? Math.min(...positives) : null
  } else {
    barreFret = positives.length ? Math.min(...positives) : null
  }
  return { frets: nf, fingering: ni, barreFret }
}

/** Masters barra (referência F / Fm / F7 …). */
const BARRE = {
  major: {
    ref: 'F',
    frets: [1, 1, 2, 3, 3, 1],
    fing: [1, 1, 2, 3, 3, 1]
  },
  minor: {
    ref: 'F',
    frets: [1, 1, 3, 3, 3, 1],
    fing: [1, 1, 3, 3, 3, 1]
  },
  dom7: {
    ref: 'F',
    frets: [1, 1, 2, 3, 4, 1],
    fing: [1, 1, 2, 3, 4, 1]
  },
  maj7: {
    ref: 'F',
    frets: [1, 1, 2, 3, 5, 1],
    fing: [1, 1, 2, 3, 4, 1]
  },
  m7: {
    ref: 'F',
    frets: [1, 1, 3, 3, 3, 1],
    fing: [1, 1, 3, 3, 3, 1]
  },
  sus4: {
    ref: 'F',
    frets: [1, 1, 3, 3, 4, 1],
    fing: [1, 1, 2, 3, 4, 1]
  },
  dim: {
    ref: 'F',
    frets: [1, 1, 2, 4, 1, 1],
    fing: [1, 1, 2, 4, 1, 1]
  },
  aug: {
    ref: 'F',
    frets: [1, 1, 2, 3, 3, 2],
    fing: [1, 1, 3, 4, 5, 4]
  }
} as const

const TYPE_ALIAS: Record<keyof typeof BARRE, string> = {
  major: 'major',
  minor: 'minor',
  dom7: 'dominant seventh',
  maj7: 'major seventh',
  m7: 'minor seventh',
  sus4: 'suspended fourth',
  dim: 'diminished',
  aug: 'augmented'
}

/** Quinta justa (power chord), referência G5 — dedos 1,3,4; sem pestana. */
const POWER5_REF = {
  tonic: 'G',
  frets: [3, 5, 5, -1, -1, -1] as number[],
  fing: [1, 3, 4, 0, 0, 0] as number[]
}

function transposeShape(
  refTonic: string,
  targetTonic: string,
  frets: number[],
  fingering: number[]
): { frets: number[]; fingering: number[] } {
  const d = chroma(targetTonic) - chroma(refTonic)
  if (Number.isNaN(d)) return { frets, fingering }
  const nf = frets.map((f) => (f <= 0 ? f : Math.min(12, f + d)))
  return { frets: nf, fingering: [...fingering] }
}

/** Formas abertas de referência (Cifra Club / violão popular). Falha em consola se o seed divergir. */
const BASIC_CHORD_VALIDATION: Record<string, { frets: number[]; fingering: string }> = {
  C: { frets: [-1, 3, 2, 0, 1, 0], fingering: '032010' },
  G: { frets: [3, 2, 0, 0, 3, 3], fingering: '320033' },
  D: { frets: [-1, -1, 0, 2, 3, 2], fingering: '000123' },
  A: { frets: [-1, 0, 2, 2, 2, 0], fingering: '001230' },
  E: { frets: [0, 2, 2, 1, 0, 0], fingering: '023100' },
  Am: { frets: [-1, 0, 2, 2, 1, 0], fingering: '002310' },
  Dm: { frets: [-1, -1, 0, 2, 3, 1], fingering: '000132' },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingering: '023000' },
  A5: { frets: [5, 7, 7, -1, -1, -1], fingering: '134000' },
  G5: { frets: [3, 5, 5, -1, -1, -1], fingering: '134000' },
  Bb5: { frets: [6, 8, 8, -1, -1, -1], fingering: '134000' }
}

function validateBasicChords(entries: ChordSeedEntry[]) {
  for (const [name, want] of Object.entries(BASIC_CHORD_VALIDATION)) {
    const found = entries.find((e) => e.name === name)
    if (!found) {
      console.warn(`⚠️ Validação: acorde base "${name}" não está na lista de seeds.`)
      continue
    }
    if (JSON.stringify(found.frets) !== JSON.stringify(want.frets)) {
      console.warn(
        `⚠️ Validação: ${name} frets — esperado ${JSON.stringify(want.frets)}, obtido ${JSON.stringify(found.frets)}`
      )
    }
    const wantFing = fingeringStringToArray(want.fingering)
    if (JSON.stringify(found.fingering) !== JSON.stringify(wantFing)) {
      console.warn(
        `⚠️ Validação: ${name} dedilhado — esperado ${want.fingering}, obtido ${JSON.stringify(found.fingering)}`
      )
    }
  }
}

function buildSeedEntries(): ChordSeedEntry[] {
  const seen = new Set<string>()
  const out: ChordSeedEntry[] = []

  const push = (e: ChordSeedEntry) => {
    if (seen.has(e.name)) return
    seen.add(e.name)
    out.push(e)
  }

  for (const [name, data] of Object.entries(CHORDS_DATABASE)) {
    push(chordDataToEntry(name, data))
  }

  for (const root of ROOTS) {
    const ch5 = getChord('5', root)
    if (ch5.empty) continue
    const name5 = chordNameFromTonal(ch5)
    if (!name5) continue
    const t5 = transposeShape(
      POWER5_REF.tonic,
      root,
      [...POWER5_REF.frets],
      [...POWER5_REF.fing]
    )
    push({
      name: name5,
      frets: t5.frets,
      fingering: t5.fingering,
      barre: false,
      barreFret: null
    })
  }

  for (const root of ROOTS) {
    for (const k of Object.keys(BARRE) as (keyof typeof BARRE)[]) {
      const alias = TYPE_ALIAS[k]
      const ch = getChord(alias, root)
      if (ch.empty) continue
      const name = chordNameFromTonal(ch)
      if (!name) continue
      const b = BARRE[k]
      const { frets, fingering, barreFret } = transposeBarre(
        b.ref,
        root,
        [...b.frets],
        [...b.fing],
        1
      )
      push({
        name,
        frets,
        fingering,
        barre: true,
        barreFret
      })
    }
  }

  validateBasicChords(out)
  return out
}

async function main() {
  const reset = process.argv.includes('--reset')
  if (reset) {
    await prisma.chordDictionary.deleteMany()
    console.log('🗑️ ChordDictionary: registos anteriores removidos (--reset).')
  }

  const entries = buildSeedEntries()
  console.log(`📥 Importando ${entries.length} acordes para ChordDictionary...`)

  const CHUNK = reset ? 250 : 40
  let n = 0
  for (let i = 0; i < entries.length; i += CHUNK) {
    const slice = entries.slice(i, i + CHUNK)
    if (reset) {
      await prisma.chordDictionary.createMany({
        data: slice.map((e) => ({
          name: e.name,
          instrument: 'guitar' as const,
          frets: JSON.stringify(e.frets),
          fingering: JSON.stringify(e.fingering),
          barre: e.barre,
          barreFret: e.barreFret
        }))
      })
    } else {
      await prisma.$transaction(
        slice.map((e) =>
          prisma.chordDictionary.upsert({
            where: {
              name_instrument: { name: e.name, instrument: 'guitar' }
            },
            create: {
              name: e.name,
              instrument: 'guitar',
              frets: JSON.stringify(e.frets),
              fingering: JSON.stringify(e.fingering),
              barre: e.barre,
              barreFret: e.barreFret
            },
            update: {
              frets: JSON.stringify(e.frets),
              fingering: JSON.stringify(e.fingering),
              barre: e.barre,
              barreFret: e.barreFret
            }
          })
        )
      )
    }
    n += slice.length
    if (n % 200 === 0 || n === entries.length) console.log(`   … ${n}`)
  }

  console.log(`✅ Concluído: ${n} acordes (${reset ? 'createMany' : 'upsert'}).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
