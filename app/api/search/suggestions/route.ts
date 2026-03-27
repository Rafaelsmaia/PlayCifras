import { NextRequest, NextResponse } from 'next/server'
import {
  suggestionArtistIds,
  suggestionSongIds,
  hydrateArtistsByIdsOrdered,
  hydrateSongsByIdsOrdered
} from '@/lib/search-service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/search/suggestions?q=
 * Retorna até 5 artistas e 5 músicas mais relevantes (SQLite: INSTR + normalização sem acentos).
 * Em PostgreSQL seria possível usar contains + mode: 'insensitive'; aqui a busca ignora acentos via camada comum.
 */
export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    if (!q) {
      return NextResponse.json({ artists: [], songs: [] })
    }

    const [artistIds, songIds] = await Promise.all([
      suggestionArtistIds(q, 5),
      suggestionSongIds(q, 5)
    ])

    const [artists, songs] = await Promise.all([
      hydrateArtistsByIdsOrdered(artistIds),
      hydrateSongsByIdsOrdered(songIds)
    ])

    return NextResponse.json({ artists, songs })
  } catch (error) {
    console.error('Error fetching search suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    )
  }
}
