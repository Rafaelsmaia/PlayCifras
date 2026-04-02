/**
 * Cria artistas que só existiam como ficheiros em public/images/artistas
 * e associa imagens.
 *
 * Uso: npx tsx scripts/ensure-artist-images.ts
 */
import { prisma } from '../lib/database'

const PREFIX = '/images/artistas'

async function main() {
  const fromFiles = [
    {
      slug: 'tom-jobim',
      name: 'Tom Jobim',
      file: 'tom-jobim.avif',
      bio: 'Antônio Carlos Jobim, conhecido como Tom Jobim, foi um compositor, maestro, pianista, cantor, arranjador e violonista brasileiro.',
    },
    {
      slug: 'adoniran-barbosa',
      name: 'Adoniran Barbosa',
      file: 'adoniran-barbosa.jpeg',
      bio: 'João Rubinato, mais conhecido pelo nome artístico Adoniran Barbosa, foi um compositor, cantor, humorista e ator brasileiro.',
    },
    {
      slug: 'claudia-leitte',
      name: 'Cláudia Leitte',
      file: 'claudia-leitte.jpeg',
      bio: 'Cantora e compositora brasileira.',
    },
  ] as const

  for (const a of fromFiles) {
    const image = `${PREFIX}/${a.file}`
    const row = await prisma.artist.upsert({
      where: { slug: a.slug },
      create: {
        name: a.name,
        slug: a.slug,
        bio: a.bio,
        image,
      },
      update: {
        image,
        bio: a.bio,
        name: a.name,
      },
    })
    console.log('OK', row.slug, '->', image)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
