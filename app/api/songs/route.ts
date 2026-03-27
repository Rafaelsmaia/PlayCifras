import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/database'
import { songWhereForGenre } from '@/lib/genre-queries'

// GET /api/songs - Buscar cifras
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const artist = searchParams.get('artist') || ''
    const difficulty = searchParams.get('difficulty') || ''
    const tags = searchParams.get('tags') || ''
    // Sem parâmetro ou "todos" => songWhereForGenre retorna null (não filtra por gênero)
    const genre = (searchParams.get('genre') || '').trim()

    const skip = (page - 1) * limit

    const parts: Prisma.SongWhereInput[] = [{ isPublic: true }]

    const genreFilter = songWhereForGenre(genre || undefined)
    if (genreFilter) parts.push(genreFilter)

    if (search) {
      parts.push({
        OR: [
          { title: { contains: search } },
          { content: { contains: search } }
        ]
      })
    }

    if (artist) {
      parts.push({
        artist: { name: { contains: artist } }
      })
    }

    if (difficulty) {
      parts.push({ difficulty })
    }

    if (tags) {
      const tagArray = tags.split(',').map((tag) => tag.trim())
      parts.push({
        tags: { contains: tagArray.join(',') }
      })
    }

    const where: Prisma.SongWhereInput =
      parts.length === 1 ? parts[0] : { AND: parts }

    // Buscar cifras
    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        include: {
          artist: true,
          chords: true,
          genre: true
        },
        orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit
      }),
      prisma.song.count({ where })
    ])

    return NextResponse.json({
      songs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching songs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch songs' },
      { status: 500 }
    )
  }
}

// POST /api/songs - Criar nova cifra
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      artistName,
      key,
      tempo,
      difficulty,
      content,
      tags,
      chords
    } = body

    // Verificar se o artista existe, se não, criar
    let artist = await prisma.artist.findUnique({
      where: { name: artistName }
    })

    if (!artist) {
      artist = await prisma.artist.create({
        data: {
          name: artistName,
          slug: artistName.toLowerCase().replace(/\s+/g, '-')
        }
      })
    }

    // Criar slug para a música
    const slug = `${title.toLowerCase().replace(/\s+/g, '-')}-${artist.slug}`

    // Criar a música
    const song = await prisma.song.create({
      data: {
        title,
        slug,
        artistId: artist.id,
        key,
        tempo,
        difficulty,
        content,
        tags: JSON.stringify(tags || []),
        chords: {
          create: chords?.map((chord: any) => ({
            name: chord.name,
            frets: JSON.stringify(chord.frets),
            fingering: JSON.stringify(chord.fingering),
            barre: chord.barre || false,
            barreFret: chord.barreFret,
            openStrings: JSON.stringify(chord.openStrings || []),
            mutedStrings: JSON.stringify(chord.mutedStrings || [])
          })) || []
        }
      },
      include: {
        artist: true,
        chords: true
      }
    })

    return NextResponse.json(song, { status: 201 })
  } catch (error) {
    console.error('Error creating song:', error)
    return NextResponse.json(
      { error: 'Failed to create song' },
      { status: 500 }
    )
  }
}
