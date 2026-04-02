import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Music } from 'lucide-react'
import { prisma } from '@/lib/database'
import SongListRow from '@/components/SongListRow'
import ArtistProfileActions from '@/components/artist/ArtistProfileActions'
import { normalizeArtistImage } from '@/lib/artist-image'
import type { Metadata } from 'next'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artist = await prisma.artist.findUnique({
    where: { slug: params.slug },
    select: { name: true },
  })
  if (!artist) return { title: 'Artista' }
  return {
    title: `${artist.name} — PlayCifras`,
    description: `Cifras e músicas de ${artist.name} no PlayCifras.`,
  }
}

export default async function ArtistaPage({ params }: Props) {
  const artist = await prisma.artist.findUnique({
    where: { slug: params.slug },
    include: {
      songs: {
        where: { isPublic: true },
        orderBy: [{ views: 'desc' }, { title: 'asc' }],
        select: {
          id: true,
          title: true,
          slug: true,
          views: true,
          key: true,
        },
      },
    },
  })

  if (!artist) {
    notFound()
  }

  const imageSrc = normalizeArtistImage(artist.image)

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-cifra-green">
            Início
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-800">{artist.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex justify-center">
                {imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc}
                    alt=""
                    className="h-40 w-40 rounded-full object-cover ring-4 ring-gray-100"
                  />
                ) : (
                  <div
                    className="flex h-40 w-40 items-center justify-center rounded-full bg-gray-100 ring-4 ring-gray-100"
                    aria-hidden
                  >
                    <Music className="h-20 w-20 text-gray-300" strokeWidth={1.25} />
                  </div>
                )}
              </div>

              <h1 className="mb-1 text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                {artist.name}
              </h1>
              {artist.bio ? (
                <p className="mb-6 text-center text-sm leading-relaxed text-gray-600">
                  {artist.bio}
                </p>
              ) : (
                <p className="mb-6 text-center text-sm text-gray-400">Artista</p>
              )}

              <ArtistProfileActions
                artistName={artist.name}
                artistSlug={artist.slug}
              />
            </div>
          </aside>

          {/* Conteúdo */}
          <section className="lg:col-span-8">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-6 text-xl font-bold text-gray-900 sm:text-2xl">
                Músicas populares
              </h2>

              {artist.songs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-6 py-12 text-center">
                  <Music className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">
                    Nenhuma cifra cadastrada para este artista ainda.
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Volte em breve ou explore a{' '}
                    <Link href="/" className="font-medium text-cifra-green hover:underline">
                      página inicial
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <table className="w-full min-w-[520px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="pb-3 pl-2 w-10 text-center">#</th>
                        <th className="pb-3 w-14" />
                        <th className="pb-3 pr-4">Música</th>
                        <th className="pb-3 px-2 text-right whitespace-nowrap">
                          Exibições
                        </th>
                        <th className="pb-3 pl-2 text-right whitespace-nowrap">Tom</th>
                      </tr>
                    </thead>
                    <tbody>
                      {artist.songs.map((song, i) => (
                        <SongListRow
                          key={song.id}
                          rank={i + 1}
                          song={{
                            id: song.id,
                            title: song.title,
                            slug: song.slug,
                            views: song.views,
                            key: song.key,
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
