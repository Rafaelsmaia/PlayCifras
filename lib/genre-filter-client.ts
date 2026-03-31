import { GENRE_TAG_KEYWORDS } from '@/lib/genre-queries'

export type SongForGenreFilter = {
  genre: { slug: string } | null
  tags: string
}

/** Espelha a lógica de `songWhereForGenre` para filtrar no cliente (pool já ordenado por views). */
export function songMatchesGenreFilter(
  song: SongForGenreFilter,
  genreSlug: string
): boolean {
  const s = genreSlug.trim().toLowerCase()
  if (s === '' || s === 'todos') return true
  if (song.genre?.slug === s) return true
  const keywords = GENRE_TAG_KEYWORDS[s]
  if (!keywords?.length) return false
  const haystack = `${song.tags}`.toLowerCase()
  return keywords.some((k) => haystack.includes(k.toLowerCase()))
}
