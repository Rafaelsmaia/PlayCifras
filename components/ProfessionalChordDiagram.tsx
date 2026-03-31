'use client'

import ChordpicDiagram from '@/components/ChordpicDiagram'
import { toReactChordsChord } from '@/lib/chord-react-chords-format'

const CHORD_NAME_ONLY_COLOR = '#00a651'
const CHORD_LOADING_OR_KNOWN_COLOR = '#7c3aed'

interface ProfessionalChordDiagramProps {
  chordName: string
  dictionaryReady?: boolean
  chordData?: {
    frets: number[]
    fingering: number[]
    barres?: Array<{
      fromString: number
      toString: number
      fret: number
    }>
  }
}

export default function ProfessionalChordDiagram({
  chordName,
  chordData,
  dictionaryReady = true
}: ProfessionalChordDiagramProps) {
  if (!chordData) {
    const color =
      dictionaryReady ? CHORD_NAME_ONLY_COLOR : CHORD_LOADING_OR_KNOWN_COLOR
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 120,
          padding: 8,
          width: 120
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color }}>{chordName}</span>
      </div>
    )
  }

  const barreAbsolutes =
    chordData.barres?.map((b) => b.fret).filter((f) => f > 0) ?? null

  const rc = toReactChordsChord(
    chordData.frets,
    chordData.fingering,
    barreAbsolutes
  )

  return (
    <div className="mx-auto w-full max-w-[200px] text-center">
      <ChordpicDiagram
        chordName={chordName}
        relFrets={rc.frets}
        fingers={rc.fingers}
        baseFret={rc.baseFret}
        barresFromDictionary={chordData.barres}
        relBarreValues={rc.barres}
      />
    </div>
  )
}
