import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { extractChordSequence, extractLyricLines } from '@/lib/video-pipeline/extract-cifra-beats'

export const dynamic = 'force-dynamic'

type Ctx = { params: { slug: string } }

/** GET /api/plugin/songs/:slug/chords — acordes na ordem tocada + letra com acordes por sílaba. */
export async function GET(_req: Request, { params }: Ctx) {
  const slug = decodeURIComponent(params.slug)
  try {
    const song = await prisma.song.findUnique({
      where: { slug },
      select: { title: true, slug: true, key: true, content: true, artist: { select: { name: true } } },
    })
    if (!song) return NextResponse.json({ error: 'Cifra não encontrada' }, { status: 404 })

    return NextResponse.json({
      ok: true,
      slug: song.slug,
      title: song.title,
      artist: song.artist.name,
      key: song.key,
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
