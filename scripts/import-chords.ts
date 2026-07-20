/**
 * Espelha a biblioteca própria (data/guitar-chords + fallback) no Postgres.
 * O app NÃO depende mais desta tabela para diagramas — o seed é opcional
 * (backup / ferramentas / futuros usos).
 *
 *   npx tsx scripts/import-chords.ts
 *   npx tsx scripts/import-chords.ts --reset
 */
import { PrismaClient } from '@prisma/client'
import { listLibraryEntries } from '../lib/guitar-chord-library'

const prisma = new PrismaClient()

async function main() {
  const reset = process.argv.includes('--reset')
  const entries = listLibraryEntries()
  const curated = entries.filter((e) => e.source === 'curated').length
  const fallback = entries.filter((e) => e.source === 'fallback').length

  console.log(
    `Biblioteca: ${entries.length} acordes (${curated} curados, ${fallback} fallback)`
  )

  if (reset) {
    await prisma.chordDictionary.deleteMany()
    console.log('ChordDictionary limpo (--reset).')
  }

  const CHUNK = reset ? 250 : 40
  let n = 0
  for (let i = 0; i < entries.length; i += CHUNK) {
    const slice = entries.slice(i, i + CHUNK)
    if (reset) {
      await prisma.chordDictionary.createMany({
        data: slice.map((e) => ({
          name: e.name,
          instrument: 'guitar' as const,
          frets: JSON.stringify(e.shape.frets),
          fingering: JSON.stringify(e.shape.fingering),
          barre: e.shape.barre,
          barreFret: e.shape.barreFret
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
              frets: JSON.stringify(e.shape.frets),
              fingering: JSON.stringify(e.shape.fingering),
              barre: e.shape.barre,
              barreFret: e.shape.barreFret
            },
            update: {
              frets: JSON.stringify(e.shape.frets),
              fingering: JSON.stringify(e.shape.fingering),
              barre: e.shape.barre,
              barreFret: e.shape.barreFret
            }
          })
        )
      )
    }
    n += slice.length
    if (n % 200 === 0 || n === entries.length) console.log(`   … ${n}`)
  }

  console.log(`Espelho no Postgres: ${n} acordes.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
