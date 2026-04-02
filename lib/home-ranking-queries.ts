import { prisma } from '@/lib/database'

/** Campos mínimos para ranking da home (sem `content`, acordes ou metadados pesados). */
export const HOME_SONG_SELECT = {
  id: true,
  title: true,
  slug: true,
  views: true,
  tags: true,
  artist: {
    select: {
      id: true,
      name: true,
      slug: true,
      image: true
    }
  },
  genre: {
    select: {
      slug: true
    }
  }
} as const

export async function fetchHomeSongsForRanking() {
  console.time('[perf] prisma:home:songs')
  const songs = await prisma.song.findMany({
    where: { isPublic: true },
    select: HOME_SONG_SELECT,
    orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
    take: 80
  })
  console.timeEnd('[perf] prisma:home:songs')
  return songs
}

export async function fetchHomeArtistsByViews() {
  console.time('[perf] prisma:home:artists')
  const songsByArtist = await prisma.song.groupBy({
    by: ['artistId'],
    where: { isPublic: true },
    _sum: { views: true },
    orderBy: {
      _sum: { views: 'desc' }
    },
    take: 7
  })

  const artistIds = songsByArtist.map((item) => item.artistId)
  if (artistIds.length === 0) {
    console.timeEnd('[perf] prisma:home:artists')
    return []
  }

  const artists = await prisma.artist.findMany({
    where: { id: { in: artistIds } },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true
    }
  })

  const artistsById = new Map(artists.map((a) => [a.id, a]))
  const ranked = songsByArtist
    .map((item) => {
      const artist = artistsById.get(item.artistId)
      if (!artist) return null
      return {
        ...artist,
        totalViews: item._sum.views ?? 0
      }
    })
    .filter(Boolean) as Array<{
    id: string
    name: string
    slug: string
    image: string | null
    totalViews: number
  }>

  console.timeEnd('[perf] prisma:home:artists')
  return ranked
}
