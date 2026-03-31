'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import useSWR from 'swr'
import { homeRankingFetcher } from '@/lib/home-ranking-fetcher'
import { HOME_RANKING_SONGS_KEY } from '@/lib/home-ranking-keys'

const MAIN: { slug: string; label: string }[] = [
  { slug: 'todos', label: 'Todos' },
  { slug: 'rock', label: 'Rock' },
  { slug: 'sertanejo', label: 'Sertanejo' },
  { slug: 'gospel', label: 'Gospel/Religioso' },
  { slug: 'mpb', label: 'MPB' },
]

const MORE: { slug: string; label: string }[] = [
  { slug: 'forro', label: 'Forró' },
  { slug: 'funk', label: 'Funk' },
  { slug: 'pop', label: 'Pop' },
  { slug: 'internacional', label: 'Internacional' },
]

interface GenreMenuProps {
  value: string
  onChange: (slug: string) => void
  /** Margem inferior; por defeito `mb-8`. */
  className?: string
}

export default function GenreMenu({ value, onChange, className }: GenreMenuProps) {
  /** Partilha cache SWR com a Home (mesma chave = um único fetch). */
  useSWR(HOME_RANKING_SONGS_KEY, homeRankingFetcher, {
    revalidateOnMount: false,
    dedupingInterval: 60_000,
    revalidateOnFocus: false
  })

  const [moreOpen, setMoreOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const moreActive = MORE.some((g) => g.slug === value)

  function pillClass(slug: string) {
    const active = value === slug
    return clsx(
      'shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors sm:text-sm',
      active
        ? 'bg-black text-white'
        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
    )
  }

  return (
    <div className={clsx('-mx-1 px-1', className ?? 'mb-8')}>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin sm:flex-wrap sm:overflow-visible">
        {MAIN.map((g) => (
          <button
            key={g.slug}
            type="button"
            onClick={() => onChange(g.slug)}
            className={pillClass(g.slug)}
          >
            {g.label}
          </button>
        ))}

        <div className="relative shrink-0" ref={wrapRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className={clsx(
              'inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-medium transition-colors sm:text-sm',
              moreActive
                ? 'bg-black text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            )}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
          >
            Mais
            <ChevronDown
              className={clsx('h-4 w-4 transition-transform', moreOpen && 'rotate-180')}
              aria-hidden
            />
          </button>
          {moreOpen && (
            <div
              className="absolute left-0 top-full z-40 mt-1 min-w-[200px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
              role="menu"
            >
              {MORE.map((g) => (
                <button
                  key={g.slug}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onChange(g.slug)
                    setMoreOpen(false)
                  }}
                  className={clsx(
                    'flex w-full px-4 py-2.5 text-left text-sm',
                    value === g.slug
                      ? 'bg-gray-100 font-semibold text-black'
                      : 'text-gray-800 hover:bg-gray-50'
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
