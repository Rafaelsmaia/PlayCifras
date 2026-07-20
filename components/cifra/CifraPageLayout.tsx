'use client'

import {
  ScrollText,
  Type,
  Minus,
  Plus,
  Music2,
  Printer,
  Download
} from 'lucide-react'

export { CHORD_PURPLE, CHORD_NAME_ONLY_COLOR } from '@/components/cifra/constants'

type ToolbarProps = {
  onPrint?: () => void
}

export function CifraToolbar({ onPrint }: ToolbarProps) {
  const btn =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-transparent text-gray-600 transition hover:border-gray-300 hover:bg-gray-50/80 lg:h-11 lg:w-11'

  return (
    <>
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
