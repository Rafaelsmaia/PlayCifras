'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Music, User } from 'lucide-react'

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

export default function BuscarClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const qParam = searchParams.get('q') ?? ''
  const rawType = searchParams.get('type')
  const typeParam = (
    rawType === 'songs' || rawType === 'artists' || rawType === 'all' ? rawType : 'all'
  ) as SearchType
  const pageParam = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  const [input, setInput] = useState(qParam)
  const [loading, setLoading] = useState(false)
  const [songs, setSongs] = useState<SongRow[]>([])
  const [artists, setArtists] = useState<ArtistRow[]>([])
  const [pagination, setPagination] = useState<{
    songs: Pagination
    artists: Pagination
  } | null>(null)

  useEffect(() => {
    setInput(qParam)
  }, [qParam])

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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setUrl({ q: input, page: 1 })
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

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">Buscar cifras</h1>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              name="q"
              autoComplete="off"
              placeholder="Nome da música ou do artista..."
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cifra-green"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-cifra-green px-6 py-3 font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            Buscar
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
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
      </div>

      {!qParam.trim() ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-600 shadow-sm">
          Digite um termo acima ou use a busca no topo do site.
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500 shadow-sm">
          Buscando...
        </div>
      ) : (
        <>
          {(typeParam === 'all' || typeParam === 'songs') && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
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
                        className="flex items-start gap-3 py-3 transition hover:bg-gray-50"
                      >
                        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cifra-green/10 text-cifra-green">
                          <Music className="h-5 w-5" aria-hidden />
                        </span>
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
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
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
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {artists.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/artista/${a.slug}`}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 transition hover:border-gray-200 hover:bg-gray-50"
                      >
                        {a.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.image}
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
                  ))}
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
