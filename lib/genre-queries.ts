import type { Prisma } from '@prisma/client'

/** Palavras extra para casar no JSON `tags` (legado / importações sem genreId). */
export const GENRE_TAG_KEYWORDS: Record<string, string[]> = {
  rock: ['rock', 'metal', 'grunge', 'punk', 'hard rock', 'alternative', 'indie rock'],
  sertanejo: ['sertanejo', 'sertaneja', 'country'],
  gospel: ['gospel', 'religious', 'christian', 'worship', 'louvor'],
  mpb: ['mpb', 'bossa', 'bossa nova', 'samba'],
  forro: ['forró', 'forro'],
  funk: ['funk', 'funk carioca'],
  pop: ['pop', 'pop rock'],
  internacional: ['international', 'internacional', 'world'],
  outros: [],
}

/**
 * Retorna filtro Prisma para músicas do gênero, ou null para "todos" (sem filtro de gênero).
 */
export function songWhereForGenre(
  genreSlug: string | null | undefined
): Prisma.SongWhereInput | null {
  const raw = (genreSlug ?? '').trim().toLowerCase()
  const slug = raw || 'todos'
  if (slug === 'todos') return null

  const keywords = GENRE_TAG_KEYWORDS[slug]
  const or: Prisma.SongWhereInput[] = [{ genre: { slug } }]

  if (keywords?.length) {
    for (const k of keywords) {
      or.push({ tags: { contains: k } })
    }
  }

  return { OR: or }
}
