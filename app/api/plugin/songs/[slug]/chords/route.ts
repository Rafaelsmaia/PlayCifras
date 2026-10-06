import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { extractChordSequence, extractLyricLines } from '@/lib/video-pipeline/extract-cifra-beats'

export const dynamic = 'force-dynamic'

type Ctx = { params: { slug: string } }

const VERSION_SUFFIX_RE = /\s*\(([^)]*)\)\s*$/
const FEATURING_RE = /^(?:part\.?|feat\.?|ft\.?|com)\s/i

/**
 * "Aquieta Minh'alma (Simplificada)" → base "Aquieta Minh'alma", rótulo "Simplificada".
 * "(part. Fulano)" é participação, não versão.
 */
function splitVersion(title: string) {
  const m = title.match(VERSION_SUFFIX_RE)
  return m && !FEATURING_RE.test(m[1].trim())
    ? { base: title.slice(0, m.index).trim(), label: m[1].trim() || 'Principal' }
    : { base: title.trim(), label: 'Principal' }
}

/** Outras cifras do mesmo artista com o mesmo título-base (ex.: versão simplificada). */
async function versionsOf(artistId: string, title: string) {
  const { base } = splitVersion(title)
  const candidates = await prisma.song.findMany({
    where: { artistId, isPublic: true, title: { startsWith: base, mode: 'insensitive' } },
    select: { slug: true, title: true, key: true },
    orderBy: { title: 'asc' },
  })
  return candidates
    .map((s) => ({ ...s, ...splitVersion(s.title) }))
    .filter((s) => s.base.toLowerCase() === base.toLowerCase())
    .sort((a, b) => Number(b.label === 'Principal') - Number(a.label === 'Principal'))
    .map(({ slug, key, label }) => ({ slug, key, label }))
}

/** GET /api/plugin/songs/:slug/chords — acordes na ordem tocada + letra com acordes por sílaba. */
export async function GET(_req: Request, { params }: Ctx) {
  const slug = decodeURIComponent(params.slug)
  try {
    const song = await prisma.song.findUnique({
      where: { slug },
      select: {
        title: true,
        slug: true,
        key: true,
        content: true,
        artistId: true,
        artist: { select: { name: true } },
      },
    })
    if (!song) return NextResponse.json({ error: 'Cifra não encontrada' }, { status: 404 })

    return NextResponse.json({
      ok: true,
      slug: song.slug,
      title: song.title,
      artist: song.artist.name,
      key: song.key,
      versions: await versionsOf(song.artistId, song.title),
      sequence: extractChordSequence(song.content),
      lines: extractLyricLines(song.content),
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Falha ao ler cifra' },
      { status: 500 }
    )
  }
}
