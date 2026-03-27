import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/database'

// POST /api/songs/view/[id] - Incrementar visualizações de forma segura
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json({ error: 'Song id is required' }, { status: 400 })
    }

    const song = await prisma.song.update({
      where: { id: params.id },
      data: {
        views: { increment: 1 }
      },
      select: {
        id: true,
        views: true
      }
    })

    return NextResponse.json(song)
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    console.error('Error incrementing song views:', error)
    return NextResponse.json(
      { error: 'Failed to increment song views' },
      { status: 500 }
    )
  }
}
