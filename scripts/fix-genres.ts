/**
 * Garante gêneros no banco e preenche Song.genreId a partir de tags + título.
 *
 *   npx tsx scripts/fix-genres.ts
 */

import { prisma } from '../lib/database'

/** Ordem: gêneros mais específicos antes dos genéricos (ex.: pop por último). */
const GENRE_DEFINITIONS: {
  slug: string
  name: string
  sortOrder: number
  keywords: string[]
}[] = [
  { slug: 'sertanejo', name: 'Sertanejo', sortOrder: 2, keywords: ['sertanejo', 'sertaneja', 'country', 'caipira'] },
  { slug: 'gospel', name: 'Gospel/Religioso', sortOrder: 3, keywords: ['gospel', 'religious', 'christian', 'worship', 'louvor', 'adoração'] },
  { slug: 'forro', name: 'Forró', sortOrder: 5, keywords: ['forró', 'forro', 'xote', 'brega'] },
  { slug: 'funk', name: 'Funk', sortOrder: 6, keywords: ['funk', 'funk carioca', 'baile funk'] },
  { slug: 'mpb', name: 'MPB', sortOrder: 4, keywords: ['mpb', 'bossa', 'bossa nova', 'samba', 'tropicalia', 'tropicália'] },
  { slug: 'rock', name: 'Rock', sortOrder: 1, keywords: ['rock', 'metal', 'grunge', 'punk', 'hard rock', 'alternative', 'indie rock', 'emo'] },
  { slug: 'internacional', name: 'Internacional', sortOrder: 8, keywords: ['international', 'internacional', 'world music', 'k-pop', 'j-pop'] },
  { slug: 'pop', name: 'Pop', sortOrder: 7, keywords: ['pop', 'dance pop', 'synth-pop', 'teen pop'] },
  { slug: 'outros', name: 'Outros', sortOrder: 99, keywords: [] },
]

function textForSong(song: { title: string; tags: string }): string {
  let extra = ''
  try {
    const j = JSON.parse(song.tags)
    if (Array.isArray(j)) {
      extra = j.join(' ')
    } else if (typeof j === 'string') {
      extra = j
    }
  } catch {
    extra = song.tags
  }
  return `${song.title} ${extra}`.toLowerCase()
}

function detectGenreSlug(text: string): string {
  for (const def of GENRE_DEFINITIONS) {
    if (def.slug === 'outros') continue
    for (const kw of def.keywords) {
      if (text.includes(kw.toLowerCase())) return def.slug
    }
  }
  return 'outros'
}

async function main() {
  for (const g of GENRE_DEFINITIONS) {
    await prisma.genre.upsert({
      where: { slug: g.slug },
      create: {
        name: g.name,
        slug: g.slug,
        sortOrder: g.sortOrder,
      },
      update: {
        name: g.name,
        sortOrder: g.sortOrder,
      },
    })
  }

  const allGenres = await prisma.genre.findMany()
  const slugToId = new Map(allGenres.map((x) => [x.slug, x.id]))
  const outrosId = slugToId.get('outros')
  if (!outrosId) throw new Error('Gênero "outros" não encontrado após upsert')

  const songs = await prisma.song.findMany({
    select: { id: true, title: true, tags: true },
  })

  let n = 0
  for (const song of songs) {
    const blob = textForSong(song)
    const slug = detectGenreSlug(blob)
    const genreId = slugToId.get(slug) ?? outrosId

    await prisma.song.update({
      where: { id: song.id },
      data: { genreId },
    })
    n++
    if (n % 2000 === 0) {
      console.log('Processadas', n, '/', songs.length)
    }
  }

  console.log('Concluído.', { total: songs.length, atualizadas: n })
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
