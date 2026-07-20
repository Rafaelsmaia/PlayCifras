'use client'

import type { ChordPopupDiagramData } from '@/lib/chord-diagram-types'
import PlayCifrasDiagramSvg from '@/components/dicionario/PlayCifrasDiagramSvg'

type Props = {
  chordName: string
  chordData?: ChordPopupDiagramData
  dictionaryReady?: boolean
  size?: 'sm' | 'md'
}

const NAME_COLOR = '#222'

/**
 * Diagrama estilo Cifra Club com fade (página da cifra / dicionário).
 */
export default function CifraClubChordDiagram({
  chordName,
  chordData,
  dictionaryReady = true,
  size = 'md'
}: Props) {
  if (!chordData?.frets?.length) {
    return (
      <div className="flex min-h-[120px] w-[110px] items-center justify-center p-2">
        <span
          className="font-montserrat text-[15px] font-bold"
          style={{ color: dictionaryReady ? NAME_COLOR : '#7c3aed' }}
        >
          {chordName}
        </span>
      </div>
    )
  }

  return (
    <div className="mx-auto w-fit text-center">
      <div
        className="mb-1 font-montserrat text-[13px] font-bold leading-tight text-gray-900"
        title={chordName}
      >
        {chordName}
      </div>
      <PlayCifrasDiagramSvg
        chordName={chordName}
        chordData={chordData}
        size={size}
        fade
        embedTitle={false}
      />
    </div>
  )
}
