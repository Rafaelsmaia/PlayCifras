import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { AdBanner } from '@/components/ads/AdBanner'
import CifraPageClient from '@/components/cifra/CifraPageClient'
import { CifraContent } from '@/components/cifra/CifraContent'
import { CifraSongHeader } from '@/components/cifra/CifraSongHeader'
import { renderCifraHtml } from '@/lib/chord-markup'
import { getSongBySlug } from '@/lib/get-song-by-slug'
import { normalizeArtistImage } from '@/lib/artist-image'
import { resolveDynamicParams } from '@/lib/route-params'

const getCachedSongBySlug = unstable_cache(getSongBySlug, ['cifra-song-by-slug-v10'], {
  revalidate: 60 * 60
})

export default async function CifraPage({
  params
}: {
  params: { slug: string }
}) {
  const { slug } = await resolveDynamicParams(params)
  const perf = process.env.NODE_ENV === 'development'
  const perfPrefix = `[cifra/page:${slug}]`

  if (perf) console.time(`${perfPrefix} getSongBySlug(cache)`)
  const result = await getCachedSongBySlug(slug)
  if (perf) console.timeEnd(`${perfPrefix} getSongBySlug(cache)`)

  if (result.status === 'not_found') {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-md px-4 py-16 text-center text-gray-600">
          <p>Cifra não encontrada</p>
          <Link href="/" className="mt-6 inline-block text-cifra-green">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  if (result.status === 'error') {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-md px-4 py-16 text-center text-gray-600">
          <p className="font-medium text-gray-900">Erro ao carregar a cifra</p>
          <p className="mt-3 text-sm leading-relaxed">
            O servidor não conseguiu acessar os dados (por exemplo, banco de dados
            indisponível ou <code className="rounded bg-gray-100 px-1">DATABASE_URL</code>{' '}
            inválida). Confira o terminal do{' '}
            <code className="rounded bg-gray-100 px-1">npm run dev</code> e o arquivo{' '}
            <code className="rounded bg-gray-100 px-1">.env</code>.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            A lista na página inicial pode ainda mostrar músicas antigas por cache de até 1 hora,
            mesmo com o banco fora do ar.
          </p>
          <Link href="/" className="mt-6 inline-block text-cifra-green">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  const { song } = result

  if (perf) console.time(`${perfPrefix} renderCifraHtml`)
  const contentHtml = renderCifraHtml(song.content)
  if (perf) console.timeEnd(`${perfPrefix} renderCifraHtml`)

  const chordsInContent = song.chordsInContent

  if (perf) console.time(`${perfPrefix} normalizeArtistImage`)
  const artistImg = normalizeArtistImage(song.artist.image)
  if (perf) console.timeEnd(`${perfPrefix} normalizeArtistImage`)

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <div className="border-b border-gray-100 bg-white print:hidden">
        <div className="mx-auto max-w-[1280px] px-4 py-3 sm:px-5 lg:px-8">
          <AdBanner slot="cifra-top" />
        </div>
      </div>

      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-5 lg:px-8">
        <CifraSongHeader
          title={song.title}
          artistName={song.artist.name}
          artistSlug={song.artist.slug}
          artistImage={artistImg}
          views={song.views}
          likes={song.likes}
        />

        <CifraPageClient
          songId={song.id}
          chordsInContent={chordsInContent}
          chordDictionary={song.chordDictionary}
          songKey={song.key}
          tempo={song.tempo}
          difficulty={song.difficulty}
          artistImg={artistImg}
          youtubeVideoId={song.youtubeVideoId}
          songTitle={song.title}
        >
          <CifraContent html={contentHtml} />
        </CifraPageClient>
      </main>
    </div>
  )
}
