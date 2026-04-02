'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Loader2, Music, User } from 'lucide-react'
import { normalizeArtistImage } from '@/lib/artist-image'

type SuggestionArtist = {
  id: string
  name: string
  slug: string
  image: string | null
}

type SuggestionSong = {
  id: string
  title: string
  slug: string
  artist: { name: string; slug: string; image?: string | null }
}

export default function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [artists, setArtists] = useState<SuggestionArtist[]>([])
  const [songs, setSongs] = useState<SuggestionSong[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 300)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!debounced) {
      setArtists([])
      setSongs([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void fetch(`/api/search/suggestions?q=${encodeURIComponent(debounced)}`)
      .then((res) => res.json())
      .then((data: { artists?: SuggestionArtist[]; songs?: SuggestionSong[] }) => {
        if (cancelled) return
        setArtists(data.artists ?? [])
        setSongs(data.songs ?? [])
      })
      .catch(() => {
        if (!cancelled) {
          setArtists([])
          setSongs([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debounced])

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const goToResults = useCallback(() => {
    const q = query.trim()
    if (!q) return
    setOpen(false)
    router.push(`/buscar?q=${encodeURIComponent(q)}`)
  }, [query, router])

  const showPanel = open && query.trim().length > 0
  const hasResults = artists.length > 0 || songs.length > 0

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-gray-400" aria-hidden />
        </div>
        <input
          ref={inputRef}
          type="search"
          autoComplete="off"
          placeholder="Buscar cifras, artistas ou músicas..."
          className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cifra-green"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              goToResults()
            }
            if (e.key === 'Escape') setOpen(false)
          }}
        />
      </div>

      {showPanel && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(70vh,420px)] overflow-y-auto rounded-lg border border-gray-100 bg-white shadow-lg"
          role="listbox"
          aria-label="Sugestões de busca"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Buscando...
            </div>
          ) : !hasResults ? (
            <div className="px-4 py-6 text-center text-sm text-gray-600">
              Nenhum resultado para &quot;{debounced}&quot;
            </div>
          ) : (
            <div className="py-2">
              {artists.length > 0 && (
                <div className="border-b border-gray-100 pb-2">
                  <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Artistas
                  </p>
                  <ul className="space-y-0.5">
                    {artists.map((a) => {
                      const img = normalizeArtistImage(a.image)
                      return (
                        <li key={a.id}>
                          <Link
                            href={`/artista/${a.slug}`}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50"
                            onClick={() => setOpen(false)}
                          >
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={img}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                                <User className="h-5 w-5" aria-hidden />
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-gray-900">
                                {a.name}
                              </span>
                              <span className="block truncate text-xs text-gray-500">Artista</span>
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {songs.length > 0 && (
                <div className={artists.length > 0 ? 'pt-2' : ''}>
                  <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Músicas
                  </p>
                  <ul className="space-y-0.5">
                    {songs.map((s) => {
                      const img = normalizeArtistImage(s.artist.image)
                      return (
                        <li key={s.id}>
                          <Link
                            href={`/cifra/${s.slug}`}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50"
                            onClick={() => setOpen(false)}
                          >
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={img}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cifra-green/10 text-cifra-green">
                                <Music className="h-5 w-5" aria-hidden />
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-gray-900">
                                {s.title}
                              </span>
                              <span className="block truncate text-xs text-gray-500">
                                Música · {s.artist.name}
                              </span>
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-100 px-3 py-2">
            <button
              type="button"
              className="w-full rounded-md py-1.5 text-center text-sm font-medium text-cifra-green hover:bg-violet-50"
              onClick={goToResults}
            >
              Ver todos os resultados
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
