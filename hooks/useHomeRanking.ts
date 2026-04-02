'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { songMatchesGenreFilter } from '@/lib/genre-filter-client'
import { homeRankingFetcher } from '@/lib/home-ranking-fetcher'
import { HOME_RANKING_KEY } from '@/lib/home-ranking-keys'

const DISPLAY_LIMIT = 15

/**
 * Cache SWR para ranking da home (endpoint unificado).
 * O pool de músicas (até 80) carrega uma vez; a troca de género filtra no cliente.
 */
export function useHomeRanking() {
  const [genre, setGenre] = useState('todos')

  const {
    data,
    isLoading,
    isValidating
  } = useSWR(HOME_RANKING_KEY, homeRankingFetcher, {
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
    keepPreviousData: true
  })

  const rawSongs = data?.songs ?? []
  const artists = data?.artists ?? []

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

  const initialLoading = isLoading && data === undefined

  return {
    genre,
    setGenre,
    songs,
    songsInitialLoading: initialLoading,
    songsValidating: isValidating,
    artists,
    artistsInitialLoading: initialLoading,
    artistsValidating: isValidating
  }
}
