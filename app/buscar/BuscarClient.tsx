'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { ChevronLeft, ChevronRight, User } from 'lucide-react'
import GenreMenu from '@/components/GenreMenu'
import { normalizeArtistImage } from '@/lib/artist-image'
import { homeRankingFetcher } from '@/lib/home-ranking-fetcher'
import { HOME_RANKING_KEY } from '@/lib/home-ranking-keys'
import { songMatchesGenreFilter } from '@/lib/genre-filter-client'
import { needsUnoptimizedRemoteImage } from '@/lib/remote-image'

type SearchType = 'all' | 'songs' | 'artists'

type SongRow = {
  id: string
  title: string
  slug: string
  views: number
  difficulty: string | null
  artist: { name: string; slug: string }
}

type ArtistRow = {
  id: string
  name: string
  slug: string
  image: string | null
  _count: { songs: number }
}

type Pagination = {
  page: number
  limit: number
  total: number
  pages: number
}

type RankingSong = {
  id: string
  title: string
  slug: string
  views: number
  tags: string
  genre: { slug: string } | null
  artist: { name: string; slug: string }
}

type RankingArtist = {
  id: string
  name: string
  slug: string
  image: string | null
  totalViews: number
}

function formatViewsBr(n: number) {
  return `${n.toLocaleString('pt-BR')} exibições`
}

function MasAcessadosSection() {
  const [genre, setGenre] = useState('todos')

  const { data: rankingData, isLoading: rankingLoading } = useSWR(
    HOME_RANKING_KEY,
    homeRankingFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  )

  const { data: artistsData, isLoading: artistsLoading } = useSWR(
    '/api/artists?limit=8&ranking=views',
    homeRankingFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  )

  const songsForColumns = useMemo(() => {
    const pool = (rankingData?.songs ?? []) as RankingSong[]
    if (genre === 'todos') return pool.slice(0, 24)
    const out: RankingSong[] = []
    for (const s of pool) {
      if (songMatchesGenreFilter(s, genre)) {
        out.push(s)
        if (out.length >= 24) break
      }
    }
    return out
  }, [rankingData?.songs, genre])

  const artists = (artistsData?.artists ?? []) as RankingArtist[]
  const loading = rankingLoading || artistsLoading

  const col = (start: number) => songsForColumns.slice(start, start + 8)

  return (
    <section className="w-full">
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        Mais acessados
      </h1>

      <GenreMenu value={genre} onChange={setGenre} className="mb-8" />

      {loading ? (
        <div className="grid animate-pulse gap-6 lg:grid-cols-4">
          {[1, 2, 3, 4].map((c) => (
            <div key={c} className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-14 rounded bg-gray-100" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Mobile: lista única + artistas */}
          <div className="space-y-10 lg:hidden">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-500">Músicas</h3>
              <ul className="space-y-0 divide-y divide-gray-50">
                {songsForColumns.map((song, i) => (
                  <SongRankRow key={song.id} rank={i + 1} song={song} />
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-500">Artistas</h3>
              <ul className="space-y-4">
                {artists.map((a, i) => (
                  <ArtistRankRow key={a.id} rank={i + 1} artist={a} />
                ))}
              </ul>
            </div>
          </div>

          {/* Desktop: 3 colunas músicas + 1 artistas */}
          <div className="hidden gap-6 lg:grid lg:grid-cols-4 lg:items-start">
            {[0, 1, 2].map((colIdx) => (
              <ul key={colIdx} className="min-w-0 space-y-0 divide-y divide-gray-50">
                {col(colIdx * 8).map((song, rowIdx) => (
                  <SongRankRow
                    key={song.id}
                    rank={colIdx * 8 + rowIdx + 1}
                    song={song}
                  />
                ))}
              </ul>
            ))}
            <ul className="min-w-0 space-y-5 border-t border-gray-200/80 pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              {artists.map((a, i) => (
                <ArtistRankRow key={a.id} rank={i + 1} artist={a} />
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}

function SongRankRow({
  rank,
  song
}: {
  rank: number
  song: RankingSong
}) {
  return (
    <li className="flex gap-2 py-2.5 pr-1 transition hover:bg-gray-50/80 sm:gap-3">
      <span
        className="w-8 shrink-0 pt-0.5 text-right text-2xl font-semibold tabular-nums text-gray-200 sm:w-10 sm:text-3xl"
        aria-hidden
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={`/cifra/${song.slug}`}
          className="block font-semibold leading-snug text-gray-900 hover:text-cifra-green"
        >
          {song.title}
        </Link>
        <Link
          href={`/artista/${song.artist.slug}`}
          className="mt-0.5 block text-sm text-gray-500 hover:text-cifra-green"
        >
          {song.artist.name}
        </Link>
      </div>
    </li>
  )
}

function ArtistRankRow({
  rank,
  artist
}: {
  rank: number
  artist: RankingArtist
}) {
  const src = normalizeArtistImage(artist.image)
  const unopt =
    !!src?.startsWith('http') && needsUnoptimizedRemoteImage(src)

  return (
    <li>
      <Link
        href={`/artista/${artist.slug}`}
        className="flex gap-3 transition hover:opacity-95"
      >
        <div className="relative shrink-0">
          {src?.startsWith('http') || src?.startsWith('/') ? (
            <Image
              src={src}
              alt=""
              width={64}
              height={64}
              className="h-14 w-14 rounded-full object-cover sm:h-16 sm:w-16"
              unoptimized={unopt}
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-500 sm:h-16 sm:w-16">
              {artist.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow-sm ring-2 ring-white"
            aria-hidden
          >
            {rank}
          </span>
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <span className="block font-bold leading-tight text-orange-600">
            {artist.name}
          </span>
          <span className="mt-0.5 block text-sm text-gray-500">
            {formatViewsBr(artist.totalViews)}
          </span>
        </div>
      </Link>
    </li>
  )
}

export default function BuscarClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const qParam = searchParams.get('q') ?? ''
  const rawType = searchParams.get('type')
  const typeParam = (
    rawType === 'songs' || rawType === 'artists' || rawType === 'all' ? rawType : 'all'
  ) as SearchType
  const pageParam = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  const [loading, setLoading] = useState(false)
  const [songs, setSongs] = useState<SongRow[]>([])
  const [artists, setArtists] = useState<ArtistRow[]>([])
  const [pagination, setPagination] = useState<{
    songs: Pagination
    artists: Pagination
  } | null>(null)

  const runSearch = useCallback(async () => {
    const q = qParam.trim()
    if (!q) {
      setSongs([])
      setArtists([])
      setPagination(null)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        q,
        type: typeParam,
        page: String(pageParam),
        limit: '12'
      })
      const res = await fetch(`/api/search?${params.toString()}`)
      const data = await res.json()
      setSongs(data.songs ?? [])
      setArtists(data.artists ?? [])
      setPagination(data.pagination ?? null)
    } catch {
      setSongs([])
      setArtists([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [qParam, typeParam, pageParam])

  useEffect(() => {
    void runSearch()
  }, [runSearch])

  const setUrl = (next: { q?: string; type?: SearchType; page?: number }) => {
    const q = (next.q !== undefined ? next.q : qParam).trim()
    const type = next.type ?? typeParam
    const page = next.page ?? pageParam
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (type !== 'all') p.set('type', type)
    if (page > 1) p.set('page', String(page))
    const qs = p.toString()
    router.push(qs ? `/buscar?${qs}` : '/buscar')
  }

  const formatViews = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  const typeTabs: { id: SearchType; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'songs', label: 'Somente músicas' },
    { id: 'artists', label: 'Somente artistas' }
  ]

  const pgSongs = pagination?.songs
  const pgArtists = pagination?.artists
  const emptyQuery = !qParam.trim()

  if (emptyQuery) {
    return <MasAcessadosSection />
  }

  return (
    <div className="space-y-10">
      <header className="border-b border-gray-200/90 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Resultados para &ldquo;{qParam.trim()}&rdquo;
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {typeTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setUrl({ type: t.id, page: 1 })}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                typeParam === t.id
                  ? 'border-cifra-green bg-green-50 text-cifra-green'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <p className="text-gray-500">Buscando...</p>
      ) : (
        <>
          {(typeParam === 'all' || typeParam === 'songs') && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Músicas
                {pgSongs ? (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({pgSongs.total} resultado{pgSongs.total !== 1 ? 's' : ''})
                  </span>
                ) : null}
              </h2>
              {songs.length === 0 ? (
                <p className="text-gray-600">Nenhuma música encontrada.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {songs.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/cifra/${s.slug}`}
                        className="flex items-start gap-3 py-3.5 transition hover:bg-gray-50/80"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-gray-900">{s.title}</span>
                          <span className="text-sm text-gray-600">{s.artist.name}</span>
                          {s.difficulty ? (
                            <span className="ml-2 text-xs text-gray-400">· {s.difficulty}</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-sm text-gray-500">
                          {formatViews(s.views)} views
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {pgSongs && pgSongs.pages > 1 && (
                <PaginationControls
                  page={pgSongs.page}
                  pages={pgSongs.pages}
                  onPrev={() => setUrl({ page: pageParam - 1 })}
                  onNext={() => setUrl({ page: pageParam + 1 })}
                />
              )}
            </section>
          )}

          {(typeParam === 'all' || typeParam === 'artists') && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Artistas
                {pgArtists ? (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({pgArtists.total} resultado{pgArtists.total !== 1 ? 's' : ''})
                  </span>
                ) : null}
              </h2>
              {artists.length === 0 ? (
                <p className="text-gray-600">Nenhum artista encontrado.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {artists.map((a) => {
                    const artistImg = normalizeArtistImage(a.image)
                    return (
                    <li key={a.id}>
                      <Link
                        href={`/artista/${a.slug}`}
                        className="flex items-center gap-3 rounded-lg py-2.5 pr-2 transition hover:bg-gray-50/80"
                      >
                        {artistImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={artistImg}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                            <User className="h-6 w-6" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-gray-900">{a.name}</span>
                          <span className="text-sm text-gray-500">
                            {a._count.songs} cifra{a._count.songs !== 1 ? 's' : ''}
                          </span>
                        </span>
                      </Link>
                    </li>
                  )})}
                </ul>
              )}
              {pgArtists && pgArtists.pages > 1 && (
                <PaginationControls
                  page={pgArtists.page}
                  pages={pgArtists.pages}
                  onPrev={() => setUrl({ page: pageParam - 1 })}
                  onNext={() => setUrl({ page: pageParam + 1 })}
                />
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function PaginationControls({
  page,
  pages,
  onPrev,
  onNext
}: {
  page: number
  pages: number
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="mt-6 flex items-center justify-center gap-4 border-t border-gray-100 pt-4">
      <button
        type="button"
        disabled={page <= 1}
        onClick={onPrev}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </button>
      <span className="text-sm text-gray-600">
        Página {page} de {pages}
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={onNext}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-40"
      >
        Próxima
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
