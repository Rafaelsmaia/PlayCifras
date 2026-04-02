/**
 * Remove do banco URLs que são só o placeholder da Last.fm (estrela genérica).
 * Uso: npx tsx scripts/clear-lastfm-placeholder-images.ts
 */
import 'dotenv/config'
import { prisma } from '../lib/database'
import { isLastFmPlaceholderImageUrl } from '../lib/artist-image'

async function main() {
  const artists = await prisma.artist.findMany({
    where: { NOT: { image: null } },
    select: { id: true, name: true, image: true },
  })

  let cleared = 0
  for (const a of artists) {
    if (a.image && isLastFmPlaceholderImageUrl(a.image)) {
      await prisma.artist.update({
        where: { id: a.id },
        data: { image: null },
      })
      cleared += 1
      console.log('Removido placeholder:', a.name)
    }
  }

  console.log('Total limpo:', cleared)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
