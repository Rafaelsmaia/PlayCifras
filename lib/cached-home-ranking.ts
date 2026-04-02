import { unstable_cache } from 'next/cache'
import {
  fetchHomeArtistsByViews,
  fetchHomeSongsForRanking
} from '@/lib/home-ranking-queries'

export const getCachedHomeSongs = unstable_cache(
  fetchHomeSongsForRanking,
  ['home-ranking-songs-v1'],
  { revalidate: 3600 }
)

export const getCachedHomeArtists = unstable_cache(
  fetchHomeArtistsByViews,
  ['home-ranking-artists-v1'],
  { revalidate: 3600 }
)
