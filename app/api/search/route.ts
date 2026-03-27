import { NextRequest, NextResponse } from 'next/server'
import {
  searchSongIds,
  countSongsSearch,
  searchArtistIds,
  countArtistsSearch,
  hydrateSongsByIdsOrdered,
  hydrateArtistsByIdsOrdered
} from '@/lib/search-service'

export const dynamic = 'force-dynamic'

function paginateMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    pages: total === 0 ? 0 : Math.ceil(total / limit)
  }
}

// GET /api/search?q=&type=all|songs|artists&page=&limit=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get('q') || '').trim()
    const type = searchParams.get('type') || 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const skip = (page - 1) * limit

    if (!query) {
      return NextResponse.json({
        songs: [],
        artists: [],
        pagination: {
          songs: paginateMeta(0, page, limit),
          artists: paginateMeta(0, page, limit)
        }
      })
    }

    const results: {
      songs: Awaited<ReturnType<typeof hydrateSongsByIdsOrdered>>
      artists: Awaited<ReturnType<typeof hydrateArtistsByIdsOrdered>>
      pagination: {
        songs: ReturnType<typeof paginateMeta>
        artists: ReturnType<typeof paginateMeta>
      }
    } = {
      songs: [],
      artists: [],
      pagination: {
        songs: paginateMeta(0, page, limit),
        artists: paginateMeta(0, page, limit)
      }
    }

    if (type === 'all' || type === 'songs') {
      const [songIds, total] = await Promise.all([
        searchSongIds(query, { take: limit, skip, includeContentTags: true }),
        countSongsSearch(query, true)
      ])
      results.songs = await hydrateSongsByIdsOrdered(songIds)
      results.pagination.songs = paginateMeta(total, page, limit)
    }

    if (type === 'all' || type === 'artists') {
      const [artistIds, total] = await Promise.all([
        searchArtistIds(query, { take: limit, skip }),
        countArtistsSearch(query)
      ])
      results.artists = await hydrateArtistsByIdsOrdered(artistIds)
      results.pagination.artists = paginateMeta(total, page, limit)
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
  }
}
