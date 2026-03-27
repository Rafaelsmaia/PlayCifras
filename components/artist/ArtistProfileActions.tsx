'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Share2, FileMusic } from 'lucide-react'

interface ArtistProfileActionsProps {
  artistName: string
  artistSlug: string
}

export default function ArtistProfileActions({
  artistName,
  artistSlug,
}: ArtistProfileActionsProps) {
  const [fav, setFav] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/artista/${artistSlug}`
      : ''

  async function handleShare() {
    const url = shareUrl || `/artista/${artistSlug}`
    try {
      if (navigator.share) {
        await navigator.share({ title: artistName, url: url })
      } else {
        await navigator.clipboard.writeText(
          typeof window !== 'undefined' ? window.location.href : url
        )
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      try {
        await navigator.clipboard.writeText(
          typeof window !== 'undefined' ? window.location.href : url
        )
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <button
        type="button"
        onClick={() => setFav((v) => !v)}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
          fav
            ? 'border-cifra-green bg-cifra-green/10 text-cifra-green'
            : 'border-gray-200 bg-white text-gray-800 hover:border-cifra-green/40 hover:bg-gray-50'
        }`}
      >
        <Heart className={`h-4 w-4 ${fav ? 'fill-current' : ''}`} aria-hidden />
        Favoritar
      </button>
      <button
        type="button"
        onClick={() => void handleShare()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-cifra-green/40 hover:bg-gray-50"
      >
        <Share2 className="h-4 w-4" aria-hidden />
        {copied ? 'Link copiado!' : 'Compartilhar'}
      </button>
      <Link
        href="/login"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-cifra-green bg-cifra-green px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <FileMusic className="h-4 w-4" aria-hidden />
        Enviar cifra
      </Link>
    </div>
  )
}
