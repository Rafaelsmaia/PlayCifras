'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import ProfessionalChordDiagram from '@/components/ProfessionalChordDiagram'
import ChordBuilder from '@/components/dicionario/ChordBuilder'
import type { ChordPopupDiagramData } from '@/lib/chord-diagram-types'
import clsx from 'clsx'

export type DictionaryChordEntry = {
  name: string
  source: 'curated' | 'fallback'
  diagram: ChordPopupDiagramData
}

const ROOT_FILTERS = [
  'Todos',
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B'
] as const

function matchesRoot(name: string, root: string): boolean {
  if (root === 'Todos') return true
  const m = /^([A-G](?:#|b)?)/.exec(name)
  return m?.[1] === root
}

type Props = {
  entries: DictionaryChordEntry[]
}

type Tab = 'biblioteca' | 'montador'

export default function ChordDictionaryClient({ entries }: Props) {
  const [tab, setTab] = useState<Tab>('biblioteca')
  const [query, setQuery] = useState('')
  const [root, setRoot] = useState<(typeof ROOT_FILTERS)[number]>('Todos')
  const [selected, setSelected] = useState<string>(
    entries.find((e) => e.name === 'C')?.name ?? entries[0]?.name ?? ''
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, '')
    return entries.filter((e) => {
      if (!matchesRoot(e.name, root)) return false
      if (!q) return true
      return e.name.toLowerCase().includes(q)
    })
  }, [entries, query, root])

  const selectedEntry =
    filtered.find((e) => e.name === selected) ??
    entries.find((e) => e.name === selected) ??
    filtered[0] ??
    null

  return (
    <div>
      <div
        className="mb-6 flex gap-1 border-b border-gray-200"
        role="tablist"
        aria-label="Seções do dicionário"
      >
        {(
          [
            { id: 'biblioteca' as const, label: 'Biblioteca' },
            { id: 'montador' as const, label: 'Montador' }
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={clsx(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
              tab === id
                ? 'border-cifra-green text-cifra-green'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'montador' ? (
        <ChordBuilder />
      ) : (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <aside className="w-full shrink-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-20 lg:w-[280px]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Violão
              </span>
              {selectedEntry && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    selectedEntry.source === 'curated'
                      ? 'bg-cifra-green/10 text-cifra-green'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {selectedEntry.source === 'curated' ? 'Curado' : 'Fallback'}
                </span>
              )}
            </div>

            {selectedEntry ? (
              <div className="flex flex-col items-center">
                <ProfessionalChordDiagram
                  chordName={selectedEntry.name}
                  chordData={selectedEntry.diagram}
                  dictionaryReady
                  size="md"
                />
                <p className="mt-4 text-center font-montserrat text-2xl font-bold text-gray-900">
                  {selectedEntry.name}
                </p>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-gray-500">
                Nenhum acorde selecionado
              </p>
            )}
          </aside>

          <div className="min-w-0 flex-1">
            <div className="relative mb-4">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar acorde (ex.: Am7, C7M, F#m)"
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-cifra-green focus:outline-none focus:ring-2 focus:ring-cifra-green/20"
                aria-label="Buscar acorde"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div
              className="mb-6 flex flex-wrap gap-1.5"
              role="group"
              aria-label="Filtrar por tônica"
            >
              {ROOT_FILTERS.map((r) => {
                const active = root === r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoot(r)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                      active
                        ? 'bg-cifra-green text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {r}
                  </button>
                )
              })}
            </div>

            <p className="mb-3 text-sm text-gray-500">
              {filtered.length} acorde{filtered.length === 1 ? '' : 's'}
              {query.trim() ? ` para “${query.trim()}”` : ''}
            </p>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-16 text-center text-sm text-gray-500">
                Nenhum acorde encontrado. Tente outro nome ou tônica.
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {filtered.map((entry) => {
                  const isActive = selectedEntry?.name === entry.name
                  return (
                    <li key={entry.name}>
                      <button
                        type="button"
                        onClick={() => setSelected(entry.name)}
                        className={`flex w-full flex-col items-center rounded-xl border bg-white p-3 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cifra-green ${
                          isActive
                            ? 'border-cifra-green shadow-sm ring-1 ring-cifra-green/30'
                            : 'border-gray-200'
                        }`}
                      >
                        <ProfessionalChordDiagram
                          chordName={entry.name}
                          chordData={entry.diagram}
                          dictionaryReady
                          size="sm"
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
