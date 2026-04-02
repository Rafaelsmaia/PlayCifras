'use client'

import Link from 'next/link'
import {
  ScrollText,
  Type,
  Minus,
  Plus,
  Music2,
  Printer,
  Download,
  Play,
  Heart
} from 'lucide-react'

/** Cor dos acordes no texto da cifra e linha “Tom:”. */
export const CHORD_PURPLE = '#7c3aed'

/** Nome de acorde sem diagrama no dicionário (fallback). */
export const CHORD_NAME_ONLY_COLOR = '#7c3aed'

type ToolbarProps = {
  onPrint?: () => void
}

export function CifraToolbar({ onPrint }: ToolbarProps) {
  const btn =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-transparent text-gray-600 transition hover:border-gray-300 hover:bg-gray-50/80 lg:h-11 lg:w-11'

  return (
    <>
      {/* Desktop: coluna vertical */}
      <div className="hidden flex-col gap-1.5 lg:flex">
        <button type="button" className={btn} title="Auto rolagem">
          <ScrollText className="h-5 w-5" />
        </button>
        <button type="button" className={btn} title="Tamanho do texto">
          <Type className="h-5 w-5" />
        </button>
        <div className="flex flex-col gap-0.5 rounded-lg border border-gray-200 bg-transparent p-0.5">
          <button type="button" className="flex h-8 items-center justify-center text-gray-600 hover:bg-gray-50" title="Diminuir texto">
            <Minus className="h-4 w-4" />
          </button>
          <button type="button" className="flex h-8 items-center justify-center text-gray-600 hover:bg-gray-50" title="Aumentar texto">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button type="button" className={btn} title="Tom">
          <Music2 className="h-5 w-5" />
        </button>
        <button type="button" className={btn} onClick={onPrint} title="Imprimir">
          <Printer className="h-5 w-5" />
        </button>
        <button type="button" className={btn} title="Baixar cifra">
          <Download className="h-5 w-5" />
        </button>
      </div>
      {/* Mobile: linha horizontal */}
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-2 lg:hidden">
        <button type="button" className={btn} title="Auto rolagem">
          <ScrollText className="h-5 w-5" />
        </button>
        <button type="button" className={btn} title="Texto">
          <Type className="h-5 w-5" />
        </button>
        <button type="button" className={btn} title="Tom">
          <Music2 className="h-5 w-5" />
        </button>
        <button type="button" className={btn} onClick={onPrint} title="Imprimir">
          <Printer className="h-5 w-5" />
        </button>
        <button type="button" className={btn} title="Baixar">
          <Download className="h-5 w-5" />
        </button>
      </div>
    </>
  )
}

export function CifraSongHeader({
  title,
  artistName,
  artistSlug,
  artistImage,
  views,
  likes,
  onFavorite
}: {
  title: string
  artistName: string
  artistSlug: string
  artistImage: string | null
  views: number
  likes: number
  onFavorite?: () => void
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

        {/* Ações logo abaixo do artista, alinhadas à coluna do texto (como Cifra Club) */}
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
            onClick={onFavorite}
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

export function CifraVideoPlaceholder({ posterUrl }: { posterUrl?: string | null }) {
  return (
    <div className="overflow-hidden bg-gray-900">
      <div className="relative aspect-video w-full">
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt="" className="h-full w-full object-cover opacity-90" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <Music2 className="h-16 w-16 text-gray-600" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg">
            <Play className="h-7 w-7 pl-1 text-gray-900" fill="currentColor" />
          </span>
        </div>
      </div>
      <p className="px-2 py-2 text-center text-xs text-gray-500">
        Vídeo em breve
      </p>
    </div>
  )
}

