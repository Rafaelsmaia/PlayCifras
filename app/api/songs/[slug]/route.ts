import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { chordDiagramsForChordNames } from '@/lib/chord-dictionary-batch'
import { extractUniqueChords } from '@/lib/chord-markup'
import { resolveDynamicParams } from '@/lib/route-params'

// GET /api/songs/[slug] - Buscar cifra específica
export async function GET(
  request: NextRequest,
  context: { params: { slug: string } | Promise<{ slug: string }> }
) {
  try {
    const { slug: rawSlug } = await resolveDynamicParams(context.params)
    const slug = decodeURIComponent(rawSlug)

    if (process.env.NODE_ENV === 'development') {
      console.log('[api/songs/[slug]] GET slug:', slug)
    }

    const song = await prisma.song.findUnique({
      where: { slug },
      include: {
        artist: true
      }
    })

    if (!song) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[api/songs/[slug]] song not found for slug:', slug)
      }
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      )
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[api/songs/[slug]] song:', song.id, song.title)
    }

    type Dict = Awaited<ReturnType<typeof chordDiagramsForChordNames>>
    let chordDictionary: Dict = {}
    try {
      const chordNames = extractUniqueChords(song.content)
      chordDictionary = await chordDiagramsForChordNames(chordNames, 'guitar')
    } catch (dictErr) {
      console.error('[api/songs/[slug]] chord dictionary skipped (música ainda devolvida):', dictErr)
    }

    return NextResponse.json({ ...song, chordDictionary })
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
