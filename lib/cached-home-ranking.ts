import { unstable_cache } from 'next/cache'
import {
  fetchHomeArtistsByViews,
  fetchHomeSongsForRanking
} from '@/lib/home-ranking-queries'

export const getCachedHomeSongs = unstable_cache(
  fetchHomeSongsForRanking,
  ['home-ranking-songs-v4'],
  { revalidate: 3600 }
)

export const getCachedHomeArtists = unstable_cache(
  fetchHomeArtistsByViews,
  ['home-ranking-artists-v4'],
  { revalidate: 3600 }
)
