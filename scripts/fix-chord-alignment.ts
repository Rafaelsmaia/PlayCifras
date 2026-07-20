/**
 * Corrige alinhamento de acordes em cifras já salvas (linhas `[C] [Am7]` apertadas).
 *   npx tsx scripts/fix-chord-alignment.ts
 */
import { realignCrampedChordLines } from '../lib/cifra-align'
import { prisma } from '../lib/database'

async function main() {
  const songs = await prisma.song.findMany({
    where: { content: { contains: '] [' } },
    select: { id: true, title: true, slug: true, content: true }
  })

  let updated = 0
  for (const song of songs) {
    const next = realignCrampedChordLines(song.content)
    if (next !== song.content) {
      await prisma.song.update({
        where: { id: song.id },
        data: { content: next }
      })
      updated += 1
      if (updated <= 15 || song.slug.includes('tempo-perdido')) {
        console.log('Corrigida:', song.title, `(${song.slug})`)
      }
    }
  }

  console.log(`Concluído. Analisadas: ${songs.length}, atualizadas: ${updated}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
