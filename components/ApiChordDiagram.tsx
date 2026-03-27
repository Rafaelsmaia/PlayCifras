'use client'

import { useState, useEffect } from 'react'
import { getChordDataFromApi, UberchordResponse } from '@/services/chordApi'

// Constantes para o diagrama
const DIAGRAM_WIDTH = 90
const DIAGRAM_HEIGHT = 110
const STRING_SPACING = 12
const FRET_SPACING = 20
const START_X = 10
const START_Y = 20

export default function ApiChordDiagram({ chordName }: { chordName: string }) {
  const [chordData, setChordData] = useState<UberchordResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChord = async () => {
      setLoading(true)
      const data = await getChordDataFromApi(chordName)
      setChordData(data)
      setLoading(false)
    }
    
    fetchChord()
  }, [chordName])

  if (loading) {
    return (
      <div className="text-center text-xs text-gray-500">
        Carregando...
      </div>
    )
  }

  if (!chordData || !chordData.strings) {
    return (
      <div className="text-center text-xs text-gray-500">
        Dados do acorde não disponíveis
      </div>
    )
  }

  // Converte strings do formato "1 X 2 2 1 0" para array de números
  const stringsArray = chordData.strings.split(' ').map(s => s === 'X' ? -1 : parseInt(s))
  const fingeringArray = chordData.fingering.split(' ').map(f => f === 'X' ? 0 : parseInt(f))

  return (
    <div className="inline-block">
      <svg width={DIAGRAM_WIDTH} height={DIAGRAM_HEIGHT} className="border border-gray-200 rounded-lg">
        {/* Cordas (linhas verticais) */}
        {[0, 1, 2, 3, 4, 5].map((stringIndex) => (
          <line
            key={`string-${stringIndex}`}
            x1={START_X + stringIndex * STRING_SPACING}
            y1={START_Y}
            x2={START_X + stringIndex * STRING_SPACING}
            y2={START_Y + 4 * FRET_SPACING}
            stroke="#333"
            strokeWidth="2"
          />
        ))}

        {/* Trastes (linhas horizontais) */}
        {[0, 1, 2, 3, 4].map((fretIndex) => (
          <line
            key={`fret-${fretIndex}`}
            x1={START_X}
            y1={START_Y + fretIndex * FRET_SPACING}
            x2={START_X + 5 * STRING_SPACING}
            y2={START_Y + fretIndex * FRET_SPACING}
            stroke="#333"
            strokeWidth={fretIndex === 0 ? "3" : "1"}
          />
        ))}

        {/* Pestana */}
        {stringsArray.some((fret: number) => fret > 0) && stringsArray[0] > 0 && (
          <rect
            x={START_X - 2}
            y={START_Y + (stringsArray[0] - 1) * FRET_SPACING - 3}
            width={5 * STRING_SPACING + 4}
            height="6"
            fill="#333"
            rx="3"
          />
        )}

        {/* Dedos */}
        {stringsArray.map((fret: number, stringIndex: number) => {
          if (fret === 0) return null // Corda solta
          if (fret === -1) return null // Corda não tocada
          
          const fingerNumber = fingeringArray[stringIndex]
          if (!fingerNumber || fingerNumber === 0) return null

          return (
            <circle
              key={`finger-${stringIndex}`}
              cx={START_X + stringIndex * STRING_SPACING}
              cy={START_Y + (fret - 0.5) * FRET_SPACING}
              r="6"
              fill="white"
              stroke="#333"
              strokeWidth="2"
            />
          )
        })}

        {/* Números dos dedos */}
        {stringsArray.map((fret: number, stringIndex: number) => {
          if (fret === 0) return null
          if (fret === -1) return null
          
          const fingerNumber = fingeringArray[stringIndex]
          if (!fingerNumber || fingerNumber === 0) return null

          return (
            <text
              key={`finger-text-${stringIndex}`}
              x={START_X + stringIndex * STRING_SPACING}
              y={START_Y + (fret - 0.5) * FRET_SPACING + 2}
              textAnchor="middle"
              fontSize="10"
              fill="#333"
              fontWeight="bold"
            >
              {fingerNumber}
            </text>
          )
        })}

        {/* Cordas abertas (O) */}
        {stringsArray.map((fret: number, stringIndex: number) => {
          if (fret === 0) {
            return (
              <text
                key={`open-${stringIndex}`}
                x={START_X + stringIndex * STRING_SPACING}
                y={START_Y - 5}
                textAnchor="middle"
                fontSize="12"
                fill="#333"
                fontWeight="bold"
              >
                O
              </text>
            )
          }
          return null
        })}

        {/* Cordas não tocadas (X) */}
        {stringsArray.map((fret: number, stringIndex: number) => {
          if (fret === -1) {
            return (
              <text
                key={`muted-${stringIndex}`}
                x={START_X + stringIndex * STRING_SPACING}
                y={START_Y - 5}
                textAnchor="middle"
                fontSize="12"
                fill="#333"
                fontWeight="bold"
              >
                X
              </text>
            )
          }
          return null
        })}
      </svg>
    </div>
  )
}