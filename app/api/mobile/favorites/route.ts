import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { requireMobileUser } from '@/lib/mobile-auth'

/** GET — lista favoritos do usuário autenticado (Bearer). */
export async function GET(req: Request) {
  const userOrRes = await requireMobileUser(req)
  if (userOrRes instanceof Response) return userOrRes

  const favorites = await prisma.userFavorite.findMany({
    where: { userId: userOrRes.id },
    include: {
      song: {
        select: {
          id: true,
          title: true,
          slug: true,
          key: true,
          difficulty: true,
          views: true,
          artist: {
            select: { name: true, slug: true, image: true },
          },
        },
      },
    },
    orderBy: { id: 'desc' },
  })

  return NextResponse.json({
    ok: true,
    favorites: favorites.map((f) => ({
      id: f.id,
      songId: f.songId,
      song: f.song,
    })),
  })
}

/** POST — { songId } adiciona favorito. */
export async function POST(req: Request) {
  const userOrRes = await requireMobileUser(req)
  if (userOrRes instanceof Response) return userOrRes

  let songId = ''
  try {
    const body = (await req.json()) as { songId?: string; slug?: string }
    if (body.songId) songId = body.songId
    else if (body.slug) {
      const song = await prisma.song.findUnique({
        where: { slug: body.slug },
        select: { id: true },
      })
      songId = song?.id || ''
    }
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!songId) {
    return NextResponse.json(
      { error: 'songId ou slug obrigatório' },
      { status: 400 }
    )
  }

  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: { id: true },
  })
  if (!song) {
    return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 })
  }

  const fav = await prisma.userFavorite.upsert({
    where: {
      userId_songId: { userId: userOrRes.id, songId },
    },
    create: { userId: userOrRes.id, songId },
    update: {},
  })

  return NextResponse.json({ ok: true, favorite: fav })
}

/** DELETE — ?songId= ou body { songId } remove favorito. */
export async function DELETE(req: Request) {
  const userOrRes = await requireMobileUser(req)
  if (userOrRes instanceof Response) return userOrRes

  const url = new URL(req.url)
  let songId = url.searchParams.get('songId') || ''
  if (!songId) {
    try {
      const body = (await req.json()) as { songId?: string }
      songId = body.songId || ''
    } catch {
      /* ignore */
    }
  }

  if (!songId) {
    return NextResponse.json({ error: 'songId obrigatório' }, { status: 400 })
  }

  await prisma.userFavorite.deleteMany({
    where: { userId: userOrRes.id, songId },
  })

  return NextResponse.json({ ok: true })
}
