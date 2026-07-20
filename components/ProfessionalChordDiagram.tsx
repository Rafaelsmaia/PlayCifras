'use client'

import CifraClubChordDiagram from '@/components/CifraClubChordDiagram'
import type { ChordPopupDiagramData } from '@/lib/chord-diagram-types'

interface ProfessionalChordDiagramProps {
  chordName: string
  dictionaryReady?: boolean
  chordData?: ChordPopupDiagramData
  size?: 'sm' | 'md'
}

/** Diagrama de acorde — visual estilo Cifra Club. */
export default function ProfessionalChordDiagram({
  chordName,
  chordData,
  dictionaryReady = true,
  size = 'md'
}: ProfessionalChordDiagramProps) {
  return (
    <CifraClubChordDiagram
      chordName={chordName}
      chordData={chordData}
      dictionaryReady={dictionaryReady}
      size={size}
    />
  )
}
