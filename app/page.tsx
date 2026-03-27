'use client'

import { useState, useEffect, useCallback } from 'react'
import { Play, CheckCircle2, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface RankedSong {
  id: string
  title: string
  slug: string
  views: number
  artist: {
    name: string
    slug: string
    image?: string | null
  }
}

interface RankedArtist {
  id: string
  name: string
  slug: string
  totalViews: number
  image?: string | null
}

function SongThumb({ src, alt }: { src?: string | null; alt: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-12 w-12 shrink-0 rounded-md object-cover"
      />
    )
  }
  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-gray-200 to-gray-300 text-xs font-bold text-gray-600"
      aria-hidden
    >
      {alt.slice(0, 1).toUpperCase()}
    </div>
  )
}

export default function Home() {
  const [songs, setSongs] = useState<RankedSong[]>([])
  const [artists, setArtists] = useState<RankedArtist[]>([])
  const [loadingSongs, setLoadingSongs] = useState(true)
  const [loadingArtists, setLoadingArtists] = useState(true)

  const fetchSongs = useCallback(async () => {
    setLoadingSongs(true)
    try {
      const params = new URLSearchParams({ limit: '15' })
      const response = await fetch(`/api/songs?${params.toString()}`)
      const data = await response.json()
      setSongs(data.songs || [])
    } catch (error) {
      console.error('Error fetching songs:', error)
      setSongs([])
    } finally {
      setLoadingSongs(false)
    }
  }, [])

  const fetchArtists = useCallback(async () => {
    setLoadingArtists(true)
    try {
      const params = new URLSearchParams({
        limit: '7',
        ranking: 'views'
      })
      const response = await fetch(`/api/artists?${params.toString()}`)
      const data = await response.json()
      setArtists(data.artists || [])
    } catch (error) {
      console.error('Error fetching artists:', error)
      setArtists([])
    } finally {
      setLoadingArtists(false)
    }
  }, [])

  useEffect(() => {
    void fetchSongs()
    void fetchArtists()
  }, [fetchSongs, fetchArtists])

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <main className="mx-auto max-w-[1200px] px-5 py-8 sm:px-6">
        <div className="hero mb-10 w-full">
          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Encontre as cifras das suas músicas favoritas
          </h1>
          <p className="mb-6 max-w-[800px] text-lg text-white/95 sm:text-xl">
            Mais de 50.000 cifras e tablaturas gratuitas para violão e guitarra
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border-0 bg-white px-6 py-3 font-semibold text-[#00a651] shadow-sm transition hover:bg-gray-50"
          >
            <Play className="h-5 w-5" />
            Começar a tocar
          </button>
        </div>

        {/* Músicas em alta — grade 3 colunas como referência */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Músicas em alta</h2>
            <Link
              href="/buscar"
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Ver mais
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {loadingSongs ? (
            <div className="py-12 text-center text-gray-500">Carregando...</div>
          ) : songs.length === 0 ? (
            <div className="py-12 text-center text-gray-600">
              Nenhuma música encontrada no ranking.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {songs.map((song, index) => (
                <div
                  key={song.id}
                  className="flex min-w-0 items-center gap-3"
                >
                  <SongThumb
                    src={song.artist.image}
                    alt={song.artist.name}
                  />
                  <span className="w-7 shrink-0 text-sm tabular-nums text-gray-500">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1">
                      <Link
                        href={`/cifra/${song.slug}`}
                        className="truncate font-semibold text-gray-900 hover:text-[#00a651]"
                      >
                        {song.title}
                      </Link>
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-blue-500"
                        aria-hidden
                      />
                    </div>
                    <Link
                      href={`/artista/${song.artist.slug}`}
                      className="block truncate text-sm text-gray-500 hover:text-[#00a651]"
                    >
                      {song.artist.name}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Artistas populares — linha horizontal */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Artistas populares</h2>
            <Link
              href="/buscar"
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Ver mais
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {loadingArtists ? (
            <div className="py-12 text-center text-gray-500">Carregando...</div>
          ) : artists.length === 0 ? (
            <div className="py-12 text-center text-gray-600">
              Nenhum artista encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-7 md:gap-x-3">
              {artists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artista/${artist.slug}`}
                  className="flex flex-col items-center"
                >
                  {artist.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.image}
                      alt=""
                      className="mb-2 h-[88px] w-[88px] rounded-full object-cover sm:h-24 sm:w-24"
                    />
                  ) : (
                    <div
                      className="mb-2 flex h-[88px] w-[88px] items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-xl font-bold text-gray-600 sm:h-24 sm:w-24"
                      aria-hidden
                    >
                      {artist.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[100px] text-center text-sm font-medium text-gray-900 sm:max-w-[120px]">
                    {artist.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-3xl font-bold text-[#00a651]">50.000+</div>
            <div className="text-gray-600">Cifras disponíveis</div>
          </div>
          <div className="card rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-3xl font-bold text-[#00a651]">2.000+</div>
            <div className="text-gray-600">Artistas</div>
          </div>
          <div className="card rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-3xl font-bold text-[#00a651]">4.8</div>
            <div className="text-gray-600">Avaliação média</div>
          </div>
        </div>
      </main>
    </div>
  )
}
