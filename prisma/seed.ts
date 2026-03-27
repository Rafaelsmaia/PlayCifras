import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const genres = [
  { name: 'Rock', slug: 'rock', sortOrder: 1 },
  { name: 'Sertanejo', slug: 'sertanejo', sortOrder: 2 },
  { name: 'Gospel/Religioso', slug: 'gospel', sortOrder: 3 },
  { name: 'MPB', slug: 'mpb', sortOrder: 4 },
  { name: 'Forró', slug: 'forro', sortOrder: 5 },
  { name: 'Funk', slug: 'funk', sortOrder: 6 },
  { name: 'Pop', slug: 'pop', sortOrder: 7 },
  { name: 'Internacional', slug: 'internacional', sortOrder: 8 },
  { name: 'Outros', slug: 'outros', sortOrder: 99 },
]

async function main() {
  for (const g of genres) {
    await prisma.genre.upsert({
      where: { slug: g.slug },
      create: g,
      update: { name: g.name, sortOrder: g.sortOrder },
    })
  }
  console.log('Genres seed OK:', genres.length)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
