'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import GenreMenu from '@/components/GenreMenu'
import { useHomeRanking } from '@/hooks/useHomeRanking'
import {
  ArtistsRowSkeleton,
  SongsGridSkeleton
} from '@/components/home/HomeSkeletons'

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

function normalizeArtistImage(src?: string | null) {
  if (!src) return null
  return src
    .replace(/^\/IMAGES\/ARTISTAS\//, '/images/artistas/')
    .replace(/^\/images\/ARTISTAS\//, '/images/artistas/')
    .replace(/^\/IMAGES\/artistas\//, '/images/artistas/')
}

function SongThumb({ src, alt }: { src?: string | null; alt: string }) {
  const normalized = normalizeArtistImage(src)
  if (normalized) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={normalized}
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
  const {
    genre,
    setGenre,
    songs,
    songsInitialLoading,
    songsValidating,
    artists,
    artistsInitialLoading,
    artistsValidating
  } = useHomeRanking()

  const songsStale = songsValidating && !songsInitialLoading
  const artistsStale = artistsValidating && !artistsInitialLoading

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1200px] px-5 py-8 sm:px-6">
        <GenreMenu value={genre} onChange={setGenre} className="mb-3" />

        <div className="mb-8 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/Banners/tiago-iorc.avif"
            alt="Tiago Iorc"
            className="h-auto w-full object-cover"
          />
        </div>

        <section
          className={clsx(
            'mb-14 transition-opacity duration-200',
            songsStale && 'opacity-60'
          )}
          aria-busy={songsStale}
        >
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
          {songsInitialLoading ? (
            <SongsGridSkeleton count={15} />
          ) : songs.length === 0 ? (
            <div className="py-12 text-center text-gray-600">
              Nenhuma música encontrada no ranking.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {(songs as RankedSong[]).map((song, index) => (
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
                    <Link
                      href={`/cifra/${song.slug}`}
                      className="block truncate font-semibold text-gray-900 hover:text-[#00a651]"
                    >
                      {song.title}
                    </Link>
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

        <section
          className={clsx(
            'mb-14 transition-opacity duration-200',
            artistsStale && 'opacity-60'
          )}
          aria-busy={artistsStale}
        >
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
          {artistsInitialLoading ? (
            <ArtistsRowSkeleton count={7} />
          ) : artists.length === 0 ? (
            <div className="py-12 text-center text-gray-600">
              Nenhum artista encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-7 md:gap-x-3">
              {(artists as RankedArtist[]).map((artist) => {
                const imageSrc = normalizeArtistImage(artist.image)
                return (
                  <Link
                    key={artist.id}
                    href={`/artista/${artist.slug}`}
                    className="flex flex-col items-center"
                  >
                    {imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageSrc}
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
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
