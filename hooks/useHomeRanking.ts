'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { songMatchesGenreFilter } from '@/lib/genre-filter-client'
import { homeRankingFetcher } from '@/lib/home-ranking-fetcher'
import {
  HOME_RANKING_ARTISTS_KEY,
  HOME_RANKING_SONGS_KEY
} from '@/lib/home-ranking-keys'

const DISPLAY_LIMIT = 15

/**
 * Cache SWR para ranking da home. O pool de músicas (até 80) carrega uma vez;
 * a troca de género filtra no cliente (mesma lógica que a API), sem novo fetch.
 */
export function useHomeRanking() {
  const [genre, setGenre] = useState('todos')

  const songsKey = HOME_RANKING_SONGS_KEY
  const artistsKey = HOME_RANKING_ARTISTS_KEY

  const {
    data: songsData,
    isLoading: songsInitialLoading,
    isValidating: songsValidating
  } = useSWR(songsKey, homeRankingFetcher, {
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
    keepPreviousData: true
  })

  const {
    data: artistsData,
    isLoading: artistsInitialLoading,
    isValidating: artistsValidating
  } = useSWR(artistsKey, homeRankingFetcher, {
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
    keepPreviousData: true
  })

  const rawSongs = songsData?.songs ?? []

  const songs = useMemo(() => {
    if (genre === 'todos') {
      return rawSongs.slice(0, DISPLAY_LIMIT)
    }
    const out: typeof rawSongs = []
    for (const s of rawSongs) {
      if (songMatchesGenreFilter(s, genre)) {
        out.push(s)
        if (out.length >= DISPLAY_LIMIT) break
      }
    }
    return out
  }, [rawSongs, genre])

  return {
    genre,
    setGenre,
    songs,
    songsInitialLoading: songsInitialLoading && songsData === undefined,
    songsValidating,
    artists: artistsData?.artists ?? [],
    artistsInitialLoading: artistsInitialLoading && artistsData === undefined,
    artistsValidating
  }
}
