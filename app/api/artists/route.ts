import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

// GET /api/artists - Buscar artistas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const ranking = searchParams.get('ranking') || ''

    const skip = (page - 1) * limit

    if (ranking === 'views') {
      const songsByArtist = await prisma.song.groupBy({
        by: ['artistId'],
        where: { isPublic: true },
        _sum: { views: true },
        orderBy: {
          _sum: { views: 'desc' }
        },
        take: limit
      })

      const artistIds = songsByArtist.map((item) => item.artistId)

      if (artistIds.length === 0) {
        return NextResponse.json({
          artists: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            pages: 0
          }
        })
      }

      const artists = await prisma.artist.findMany({
        where: {
          id: { in: artistIds }
        },
        select: {
          id: true,
          name: true,
          slug: true,
          image: true
        }
      })

      const artistsById = new Map(artists.map((artist) => [artist.id, artist]))
      const rankedArtists = songsByArtist
        .map((item) => {
          const artist = artistsById.get(item.artistId)
          if (!artist) return null
          return {
            ...artist,
            totalViews: item._sum.views ?? 0
          }
        })
        .filter(Boolean)

      return NextResponse.json({
        artists: rankedArtists,
        pagination: {
          page: 1,
          limit,
          total: rankedArtists.length,
          pages: rankedArtists.length > 0 ? 1 : 0
        }
      })
    }

    const where = search ? {
      name: { contains: search }
    } : {}

    const [artists, total] = await Promise.all([
      prisma.artist.findMany({
        where,
        include: {
          _count: {
            select: { songs: true }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit
      }),
      prisma.artist.count({ where })
    ])

    return NextResponse.json({
      artists,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching artists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch artists' },
      { status: 500 }
    )
  }
}

// POST /api/artists - Criar novo artista
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, bio, image } = body

    const artist = await prisma.artist.create({
      data: {
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        bio,
        image
      }
    })

    return NextResponse.json(artist, { status: 201 })
  } catch (error) {
    console.error('Error creating artist:', error)
    return NextResponse.json(
      { error: 'Failed to create artist' },
      { status: 500 }
    )
  }
}
