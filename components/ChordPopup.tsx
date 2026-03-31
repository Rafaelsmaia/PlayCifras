'use client'

import { useState, useRef, useEffect } from 'react'
import ProfessionalChordDiagram from './ProfessionalChordDiagram'

export interface ChordPopupDiagramData {
  frets: number[]
  fingering: number[]
  barres?: Array<{
    fromString: number
    toString: number
    fret: number
  }>
}

interface ChordPopupProps {
  chordName: string
  chordData?: ChordPopupDiagramData
  /** Ver ProfessionalChordDiagram — evita verde de fallback antes do dicionário carregar. */
  dictionaryReady?: boolean
  isVisible: boolean
  position: { x: number; y: number }
}

export default function ChordPopup({
  chordName,
  chordData,
  dictionaryReady = true,
  isVisible,
  position
}: ChordPopupProps) {
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isVisible || !popupRef.current) return

    const update = () => {
      const el = popupRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let x = position.x
      let y = position.y - rect.height - 12

      if (x + rect.width > viewportWidth - 16) {
        x = viewportWidth - rect.width - 16
      }
      if (x < 16) x = 16
      if (y < 16) {
        y = position.y + 24
      }
      if (y + rect.height > viewportHeight - 16) {
        y = viewportHeight - rect.height - 16
      }

      setPopupPosition({ x, y })
    }

    requestAnimationFrame(() => requestAnimationFrame(update))
  }, [isVisible, position, chordName, chordData])

  if (!isVisible) return null

  return (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        zIndex: 9999,
        backgroundColor: 'white',
        border: '2px solid #00a651',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        padding: '6px 8px',
        pointerEvents: 'none',
        left: popupPosition.x,
        top: popupPosition.y,
        boxSizing: 'border-box',
        width: 'fit-content',
        maxWidth: 'min(calc(100vw - 32px), 220px)'
      }}
    >
      <ProfessionalChordDiagram
        chordName={chordName}
        chordData={chordData}
        dictionaryReady={dictionaryReady}
      />
    </div>
  )
}
