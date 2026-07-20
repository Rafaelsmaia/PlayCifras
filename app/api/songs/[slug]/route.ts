import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { getSongBySlug } from '@/lib/get-song-by-slug'
import { resolveDynamicParams } from '@/lib/route-params'

// GET /api/songs/[slug] - Buscar cifra específica
export async function GET(
  request: NextRequest,
  context: { params: { slug: string } | Promise<{ slug: string }> }
) {
  try {
    const { slug: rawSlug } = await resolveDynamicParams(context.params)

    if (process.env.NODE_ENV === 'development') {
      console.log('[api/songs/[slug]] GET slug:', rawSlug)
    }

    const result = await getSongBySlug(rawSlug)

    if (result.status === 'not_found') {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    if (result.status === 'error') {
      return NextResponse.json({ error: 'Failed to fetch song' }, { status: 500 })
    }

    return NextResponse.json(result.song)
  } catch (error) {
    console.error('Error fetching song:', error)
    return NextResponse.json(
      { error: 'Failed to fetch song' },
      { status: 500 }
    )
  }
}

// PUT /api/songs/[slug] - Atualizar cifra
export async function PUT(
  request: NextRequest,
  context: { params: { slug: string } | Promise<{ slug: string }> }
) {
  try {
    const { slug } = await resolveDynamicParams(context.params)
    const body = await request.json()
    const {
      title,
      key,
      tempo,
      difficulty,
      content,
      tags,
      chords
    } = body

    const song = await prisma.song.update({
      where: { slug },
      data: {
        title,
        key,
        tempo,
        difficulty,
        content,
        tags: JSON.stringify(tags || [])
      },
      include: {
        artist: true,
        chords: true
      }
    })

    // Atualizar acordes se fornecidos
    if (chords) {
      // Deletar acordes existentes
      await prisma.chord.deleteMany({
        where: { songId: song.id }
      })

      // Criar novos acordes
      await prisma.chord.createMany({
        data: chords.map((chord: any) => ({
          songId: song.id,
          name: chord.name,
          frets: JSON.stringify(chord.frets),
          fingering: JSON.stringify(chord.fingering),
          barre: chord.barre || false,
          barreFret: chord.barreFret,
          openStrings: JSON.stringify(chord.openStrings || []),
          mutedStrings: JSON.stringify(chord.mutedStrings || [])
        }))
      })
    }

    return NextResponse.json(song)
  } catch (error) {
    console.error('Error updating song:', error)
    return NextResponse.json(
      { error: 'Failed to update song' },
      { status: 500 }
    )
  }
}

// DELETE /api/songs/[slug] - Deletar cifra
export async function DELETE(
  request: NextRequest,
  context: { params: { slug: string } | Promise<{ slug: string }> }
) {
  try {
    const { slug } = await resolveDynamicParams(context.params)
    await prisma.song.delete({
      where: { slug }
    })

    return NextResponse.json({ message: 'Song deleted successfully' })
  } catch (error) {
    console.error('Error deleting song:', error)
    return NextResponse.json(
      { error: 'Failed to delete song' },
      { status: 500 }
    )
  }
}
