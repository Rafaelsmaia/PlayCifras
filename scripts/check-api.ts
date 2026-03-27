import { prisma } from '@/lib/database'

async function main() {
  const songs = await prisma.song.findMany({
    where: { isPublic: true },
    take: 8,
    orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
    include: { artist: true, chords: true, genre: true },
  })

  console.log('songs:', songs.length)
  console.log(
    'first:',
    songs[0]?.title,
    'genre:',
    songs[0]?.genre?.slug ?? null
  )

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})

