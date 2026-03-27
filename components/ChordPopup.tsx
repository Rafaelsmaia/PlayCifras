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
  isVisible: boolean
  position: { x: number; y: number }
}

export default function ChordPopup({
  chordName,
  chordData,
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
        padding: '10px',
        pointerEvents: 'none',
        left: popupPosition.x,
        top: popupPosition.y,
        width: 132,
        maxWidth: 'min(132px, calc(100vw - 32px))'
      }}
    >
      <ProfessionalChordDiagram chordName={chordName} chordData={chordData} />
    </div>
  )
}
