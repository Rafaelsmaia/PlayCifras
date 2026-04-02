import { NextResponse } from 'next/server'
import {
  getCachedHomeArtists,
  getCachedHomeSongs
} from '@/lib/cached-home-ranking'

/** ISR: resposta cacheada 1h; dados vêm de unstable_cache + Prisma otimizado. */
export const revalidate = 3600

export async function GET() {
  try {
    console.time('[perf] home:ranking:response')
    const [songs, artists] = await Promise.all([
      getCachedHomeSongs(),
      getCachedHomeArtists()
    ])
    console.timeEnd('[perf] home:ranking:response')
    return NextResponse.json({ songs, artists })
  } catch (e) {
    console.error('[api/home/ranking]', e)
    return NextResponse.json(
      { error: 'Failed to load home ranking' },
      { status: 500 }
    )
  }
}
