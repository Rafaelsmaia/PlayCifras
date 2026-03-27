'use client'

import { useEffect, useRef } from 'react'
import { SVGuitarChord } from 'svguitar'

interface ProfessionalChordDiagramProps {
  chordName: string
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

export default function ProfessionalChordDiagram({ chordName, chordData }: ProfessionalChordDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Limpa o conteúdo anterior
    containerRef.current.innerHTML = ''

    // Cria uma nova instância do SVGuitar
    const chart = new SVGuitarChord(containerRef.current)

    if (chordData) {
      // Converte os dados para o formato do SVGuitar
      const fingers: Array<[number, number, string]> = []
      const barres: Array<{ fromString: number; toString: number; fret: number; text: string }> = []
      
      // Processa os dados do acorde
      chordData.frets.forEach((fret, stringIndex) => {
        if (fret > 0) {
          const fingerNumber = chordData.fingering[stringIndex] || 1
          fingers.push([stringIndex + 1, fret, fingerNumber.toString()])
        }
      })

      // Processa pestanas se existirem
      if (chordData.barres) {
        chordData.barres.forEach(barre => {
          barres.push({
            fromString: barre.fromString,
            toString: barre.toString,
            fret: barre.fret,
            text: '1'
          })
        })
      }

      // Configura o diagrama
      chart
        .chord({
          fingers: fingers,
          barres: barres,
          title: chordName,
          tuning: ['E', 'A', 'D', 'G', 'B', 'E'],
        } as Parameters<typeof chart.chord>[0])
        .draw()
    } else {
      // Fallback para acordes comuns
      const commonChords: Record<string, { fingers: Array<[number, number, string]>, barres?: Array<{ fromString: number; toString: number; fret: number; text: string }> }> = {
        'C': { 
          fingers: [[2, 1, '1'], [4, 2, '2'], [5, 1, '3']] 
        },
        'F': { 
          fingers: [[1, 1, '1'], [2, 1, '1'], [3, 2, '2'], [4, 2, '2'], [5, 1, '1'], [6, 1, '1']],
          barres: [{ fromString: 1, toString: 6, fret: 1, text: '1' }]
        },
        'G': { 
          fingers: [[1, 3, '3'], [5, 2, '2'], [6, 3, '3']] 
        },
        'Am': { 
          fingers: [[2, 1, '1'], [3, 2, '2'], [4, 2, '3']] 
        },
        'Em': { 
          fingers: [[2, 2, '2'], [3, 2, '2']] 
        },
        'D': { 
          fingers: [[1, 2, '2'], [3, 2, '1'], [4, 3, '3'], [5, 2, '2']] 
        },
        'A': { 
          fingers: [[2, 2, '1'], [3, 2, '2'], [4, 2, '3']] 
        },
        'E': { 
          fingers: [[3, 1, '1'], [4, 2, '2'], [5, 2, '2']] 
        }
      }

      const chord = commonChords[chordName]
      if (chord) {
        chart
          .chord({
            fingers: chord.fingers,
            barres: chord.barres || [],
            title: chordName,
            tuning: ['E', 'A', 'D', 'G', 'B', 'E'],
          } as Parameters<typeof chart.chord>[0])
          .draw()
      } else {
        // Acorde não encontrado
        containerRef.current.innerHTML = `
          <div style="text-align: center; padding: 20px; color: #666;">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">${chordName}</div>
            <div style="font-size: 12px;">Acorde não encontrado</div>
          </div>
        `
      }
    }
  }, [chordName, chordData])

  return (
    <div className="professional-chord-container" style={{ display: 'inline-block' }}>
      <div ref={containerRef} style={{ width: '120px', height: '140px' }} />
    </div>
  )
}
