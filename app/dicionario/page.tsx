import type { Metadata } from 'next'
import Link from 'next/link'
import ChordDictionaryClient, {
  type DictionaryChordEntry
} from '@/components/dicionario/ChordDictionaryClient'
import {
  guitarChordToDiagramData,
  listLibraryEntries
} from '@/lib/guitar-chord-library'

export const metadata: Metadata = {
  title: 'Dicionário de Acordes | PlayCifras',
  description:
    'Pesquise digitações de acordes de violão na biblioteca do PlayCifras.'
}

function sortEntries(a: DictionaryChordEntry, b: DictionaryChordEntry) {
  if (a.source !== b.source) return a.source === 'curated' ? -1 : 1
  return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
}

export default function DicionarioPage() {
  const entries: DictionaryChordEntry[] = listLibraryEntries()
    .map((e) => ({
      name: e.name,
      source: e.source,
      diagram: guitarChordToDiagramData(e.shape)
    }))
    .sort(sortEntries)

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-10">
      <nav className="mb-4 text-sm text-gray-500" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-cifra-green">
              Início
            </Link>
          </li>
          <li aria-hidden className="text-gray-300">
            ›
          </li>
          <li className="font-medium text-gray-800">Dicionário de Acordes</li>
        </ol>
      </nav>

      <h1 className="mb-2 font-montserrat text-2xl font-bold text-gray-900 sm:text-3xl">
        Dicionário de acordes
      </h1>
      <p className="mb-8 max-w-2xl text-sm text-gray-600 sm:text-base">
        Busque digitações da biblioteca do PlayCifras — as mesmas usadas nas
        cifras.
      </p>

      <ChordDictionaryClient entries={entries} />
    </div>
  )
}
