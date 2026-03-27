import { prisma } from '@/lib/database'

async function main() {
  const totalAll = await prisma.song.count()
  const totalPublic = await prisma.song.count({ where: { isPublic: true } })
  const nullGenre = await prisma.song.count({ where: { genreId: null } })

  console.log({ totalAll, totalPublic, nullGenre })

  await prisma.$disconnect()
}

main()
