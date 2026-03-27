import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/database'
import { normalizeSearchNeedle } from '@/lib/search-normalize'
import { buildSqliteNoAccentLowerSQL } from '@/lib/search-sqlite'

function songMatchOr(needle: string, includeContentTags: boolean) {
  const parts = [
    Prisma.sql`instr(${Prisma.raw(buildSqliteNoAccentLowerSQL('s.title'))}, ${needle}) > 0`,
    Prisma.sql`instr(${Prisma.raw(buildSqliteNoAccentLowerSQL('a.name'))}, ${needle}) > 0`
  ]
  if (includeContentTags) {
    parts.push(
      Prisma.sql`instr(${Prisma.raw(buildSqliteNoAccentLowerSQL('s.content'))}, ${needle}) > 0`,
      Prisma.sql`instr(${Prisma.raw(buildSqliteNoAccentLowerSQL('s.tags'))}, ${needle}) > 0`
    )
  }
  return Prisma.join(parts, ' OR ')
}

export async function searchSongIds(
  q: string,
  opts: { take: number; skip: number; includeContentTags: boolean }
): Promise<string[]> {
  const needle = normalizeSearchNeedle(q)
  if (!needle) return []

  const whereOr = songMatchOr(needle, opts.includeContentTags)

  const rows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT s.id
      FROM songs s
      INNER JOIN artists a ON a.id = s."artistId"
      WHERE s."isPublic" = 1 AND (${whereOr})
      ORDER BY s."views" DESC
      LIMIT ${opts.take} OFFSET ${opts.skip}
    `
  )
  return rows.map((r) => r.id)
}

export async function countSongsSearch(
  q: string,
  includeContentTags: boolean
): Promise<number> {
  const needle = normalizeSearchNeedle(q)
  if (!needle) return 0

  const whereOr = songMatchOr(needle, includeContentTags)

  const rows = await prisma.$queryRaw<{ c: bigint }[]>(
    Prisma.sql`
      SELECT COUNT(*) AS c
      FROM songs s
      INNER JOIN artists a ON a.id = s."artistId"
      WHERE s."isPublic" = 1 AND (${whereOr})
    `
  )
  return Number(rows[0]?.c ?? 0)
}

export async function searchArtistIds(
  q: string,
  opts: { take: number; skip: number }
): Promise<string[]> {
  const needle = normalizeSearchNeedle(q)
  if (!needle) return []

  const rows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT a.id
      FROM artists a
      WHERE instr(${Prisma.raw(buildSqliteNoAccentLowerSQL('a.name'))}, ${needle}) > 0
      ORDER BY (
        SELECT COALESCE(SUM(s2."views"), 0)
        FROM songs s2
        WHERE s2."artistId" = a.id AND s2."isPublic" = 1
      ) DESC, a.name ASC
      LIMIT ${opts.take} OFFSET ${opts.skip}
    `
  )
  return rows.map((r) => r.id)
}

export async function countArtistsSearch(q: string): Promise<number> {
  const needle = normalizeSearchNeedle(q)
  if (!needle) return 0

  const rows = await prisma.$queryRaw<{ c: bigint }[]>(
    Prisma.sql`
      SELECT COUNT(*) AS c
      FROM artists a
      WHERE instr(${Prisma.raw(buildSqliteNoAccentLowerSQL('a.name'))}, ${needle}) > 0
    `
  )
  return Number(rows[0]?.c ?? 0)
}

export async function suggestionSongIds(q: string, take: number): Promise<string[]> {
  return searchSongIds(q, { take, skip: 0, includeContentTags: false })
}

export async function suggestionArtistIds(q: string, take: number): Promise<string[]> {
  return searchArtistIds(q, { take, skip: 0 })
}

export async function hydrateSongsByIdsOrdered(ids: string[]) {
  if (ids.length === 0) return []
  const rows = await prisma.song.findMany({
    where: { id: { in: ids } },
    include: {
      artist: { select: { name: true, slug: true } }
    }
  })
  const map = new Map(rows.map((s) => [s.id, s]))
  return ids.map((id) => map.get(id)).filter(Boolean) as typeof rows
}

export async function hydrateArtistsByIdsOrdered(ids: string[]) {
  if (ids.length === 0) return []
  const rows = await prisma.artist.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      _count: { select: { songs: true } }
    }
  })
  const map = new Map(rows.map((a) => [a.id, a]))
  return ids.map((id) => map.get(id)).filter(Boolean) as typeof rows
}
