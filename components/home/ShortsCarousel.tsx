'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

const VIDEOS = [
  { id: 'kaE_1Ea3CN4' },
  { id: 'R7TZKTz21aM' },
  { id: 'b2Lk2JVfzpM' },
  { id: 'bTd2nnpSfpY' },
  { id: 'oZ2xlST5EUU' }
] as const

function embedUrl(videoId: string) {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1'
  })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

export default function ShortsCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return
    const cards = root.querySelectorAll('[data-carousel-card]')
    const obs = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0)
          )[0]
        if (!best?.target) return
        const idx = Array.from(cards).indexOf(best.target as Element)
        if (idx >= 0) setActive(idx)
      },
      { root, rootMargin: '0px', threshold: [0.35, 0.55, 0.75] }
    )
    cards.forEach((c) => obs.observe(c))
    return () => obs.disconnect()
  }, [])

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-carousel-card]')
    const step = (card?.offsetWidth ?? 260) + 16
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  const goTo = (i: number) => {
    const el = scrollerRef.current
    if (!el) return
    const cards = el.querySelectorAll<HTMLElement>('[data-carousel-card]')
    cards[i]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest'
    })
  }

  return (
    <section
      className="border-t border-gray-200 pt-14"
      aria-labelledby="aulas-rapidas-heading"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            id="aulas-rapidas-heading"
            className="text-2xl font-bold text-gray-900"
          >
            Aulas Rápidas
          </h2>
        </div>
        <a
          href="https://www.youtube.com/results?search_query=PlayCifras+shorts"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center rounded-lg bg-[#00a651] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#009146]"
        >
          Ver mais no YouTube
        </a>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scrollByDir(-1)}
          className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-gray-200 bg-white/95 p-2.5 text-gray-800 shadow-md transition hover:bg-white md:flex"
          aria-label="Vídeo anterior"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => scrollByDir(1)}
          className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-gray-200 bg-white/95 p-2.5 text-gray-800 shadow-md transition hover:bg-white md:flex"
          aria-label="Próximo vídeo"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <div
          ref={scrollerRef}
          className="hide-scrollbar-x flex snap-x snap-mandatory gap-4 overflow-x-auto pl-0 pr-1 md:px-12"
        >
          {VIDEOS.map((v, i) => (
            <article
              key={v.id}
              data-carousel-card
              className="snap-center shrink-0 snap-always"
            >
              <div
                className={clsx(
                  'relative w-[min(72vw,260px)] overflow-hidden rounded-2xl bg-black shadow-lg ring-1 ring-black/10',
                  'aspect-[9/16] max-h-[min(72vh,520px)]'
                )}
              >
                <iframe
                  title={`PlayCifras — Short ${i + 1}`}
                  src={embedUrl(v.id)}
                  className="absolute inset-0 h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent px-3 pb-3 pt-12"
                  aria-hidden
                >
                  <p className="text-center text-base font-bold text-white">
                    PlayCifras
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-2">
        {VIDEOS.map((v, i) => (
          <button
            key={v.id}
            type="button"
            onClick={() => goTo(i)}
            className={clsx(
              'h-2.5 rounded-full transition-all',
              i === active
                ? 'w-8 bg-[#f97316]'
                : 'w-2.5 bg-gray-300 hover:bg-gray-400'
            )}
            aria-label={`Ir para o vídeo ${i + 1}`}
            aria-current={i === active ? 'true' : undefined}
          />
        ))}
      </div>
    </section>
  )
}
