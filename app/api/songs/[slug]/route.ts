import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

// GET /api/songs/[slug] - Buscar cifra específica
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const song = await prisma.song.findUnique({
      where: { slug: params.slug },
      include: {
        artist: true,
        chords: true
      }
    })

    if (!song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(song)
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
  { params }: { params: { slug: string } }
) {
  try {
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
      where: { slug: params.slug },
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
  { params }: { params: { slug: string } }
) {
  try {
    await prisma.song.delete({
      where: { slug: params.slug }
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
