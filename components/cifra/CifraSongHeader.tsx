import Link from 'next/link'
import { Heart } from 'lucide-react'
import { CHORD_PURPLE } from '@/components/cifra/constants'

export function CifraSongHeader({
  title,
  artistName,
  artistSlug,
  artistImage,
  views,
  likes
}: {
  title: string
  artistName: string
  artistSlug: string
  artistImage: string | null
  views: number
  likes: number
}) {
  const formatViews = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
        : String(n)

  return (
    <div className="flex gap-4 pb-6 sm:gap-6 lg:pb-8">
      {artistImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artistImage}
          alt=""
          className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-gray-100 sm:h-24 sm:w-24"
        />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-2xl font-bold text-gray-600 sm:h-24 sm:w-24">
          {artistName.slice(0, 1).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
          <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          <p className="shrink-0 text-sm text-gray-500">
            {formatViews(views)} exibições
          </p>
        </div>
        <Link
          href={`/artista/${artistSlug}`}
          className="mt-1 block text-lg font-bold sm:text-xl"
          style={{ color: CHORD_PURPLE }}
        >
          {artistName}
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
          <select
            className="min-w-0 max-w-full flex-1 rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 shadow-sm sm:flex-none sm:min-w-[min(100%,320px)]"
            defaultValue="principal"
            aria-label="Versão da cifra"
          >
            <option value="principal">Cifra: Principal (violão e guitarra)</option>
          </select>
          <button
            type="button"
            style={{ backgroundColor: CHORD_PURPLE }}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Heart className="h-4 w-4" strokeWidth={2} />
            Favoritar cifra
            <span className="font-normal opacity-90">({likes})</span>
          </button>
        </div>
      </div>
    </div>
  )
}
