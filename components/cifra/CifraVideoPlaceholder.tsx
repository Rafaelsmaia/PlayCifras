'use client'

import { Music2, Play } from 'lucide-react'

function embedUrl(videoId: string) {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

type CifraVideoProps = {
  youtubeVideoId?: string | null
  posterUrl?: string | null
  title?: string
}

export function CifraVideoPlaceholder({
  youtubeVideoId,
  posterUrl,
  title = 'Clipe da música',
}: CifraVideoProps) {
  if (youtubeVideoId) {
    return (
      <div className="overflow-hidden rounded-md bg-gray-900 shadow-sm ring-1 ring-black/5">
        <div className="relative aspect-video w-full">
          <iframe
            src={embedUrl(youtubeVideoId)}
            title={title}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md bg-gray-900">
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
      <p className="px-2 py-2 text-center text-xs text-gray-500">Vídeo em breve</p>
    </div>
  )
}
