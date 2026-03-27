'use client'

import { useEffect, useRef } from 'react'
import VexFlow from 'vexflow'

/** Compatível com o padrão antigo `Vex.Flow.*` (VexFlow 5 expõe classes em `VexFlow.*`). */
const Vex = { Flow: VexFlow }

interface VexFlowChordDiagramProps {
  chordName: string
  chordData: {
    frets: number[]
    fingering: string
  }
}

export default function VexFlowChordDiagram({ chordName, chordData }: VexFlowChordDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Limpar container anterior
    containerRef.current.innerHTML = ''

    // Criar renderer
    const renderer = new Vex.Flow.Renderer(containerRef.current, Vex.Flow.Renderer.Backends.SVG)
    const ctx = renderer.getContext()
    ctx.setFont('Arial', 10)

    // Configurações do diagrama
    const x = 10
    const y = 20
    const width = 100
    const height = 80

    // Criar stave (braço do violão)
    const stave = new Vex.Flow.Stave(x, y, width)
    stave.addClef('treble')
    stave.setContext(ctx).draw()

    // Converter dados do acorde para formato VexFlow
    const chordPositions = chordData.frets.map((fret, stringIndex) => {
      if (fret === 0) return null
      
      // Mapear cordas do violão (6ª corda = índice 0, 1ª corda = índice 5)
      const string = 5 - stringIndex // Inverter ordem das cordas
      return {
        string: string,
        fret: fret
      }
    }).filter(Boolean)

    // Criar chord symbol
    if (chordPositions.length > 0) {
      const chord = new Vex.Flow.StaveNote({
        clef: 'treble',
        keys: chordPositions.map((pos) => {
          if (!pos) return 'c/4'
          const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
          const openStrings = ['E', 'B', 'G', 'D', 'A', 'E'] // 1ª a 6ª corda
          const openNote = openStrings[pos.string]
          const noteIndex = noteNames.indexOf(openNote)
          const newNoteIndex = (noteIndex + pos.fret) % 12
          return noteNames[newNoteIndex] + '/4'
        }),
        duration: 'w'
      })

      // Adicionar dedos
      chordPositions.forEach((pos) => {
        if (pos) {
          ;(chord as { addDotToAll?: () => void }).addDotToAll?.()
        }
      })

      // Renderizar
      const voice = new Vex.Flow.Voice({ numBeats: 1, beatValue: 4 })
      voice.addTickables([chord])
      
      const formatter = new Vex.Flow.Formatter().joinVoices([voice]).format([voice], width - 20)
      voice.draw(ctx, stave)
    }

    // Adicionar nome do acorde
    ctx.setFont('Arial', 12, 'bold')
    ctx.fillText(chordName, x + width/2 - 20, y - 5)

  }, [chordName, chordData])

  return (
    <div className="text-center">
      <div ref={containerRef} className="inline-block"></div>
    </div>
  )
}
