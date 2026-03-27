'use client'

import { getChordData, ChordData } from '@/data/chordsDatabase'

interface OptimizedChordDiagramProps {
  chordName: string
}

// Template fixo para todos os diagramas
const CHORD_TEMPLATE = {
  width: 100,
  height: 120,
  stringSpacing: 16,
  fretSpacing: 20,
  startX: 20,
  startY: 25,
  stringCount: 6,
  fretCount: 4
}

export default function OptimizedChordDiagram({ chordName }: OptimizedChordDiagramProps) {
  const chordData = getChordData(chordName)

  if (!chordData) {
    return (
      <div className="text-center">
        <div className="text-sm font-bold mb-2 text-gray-900">{chordName}</div>
        <div className="text-xs text-gray-500">Acorde não encontrado</div>
      </div>
    )
  }

  const { width, height, stringSpacing, fretSpacing, startX, startY, stringCount, fretCount } = CHORD_TEMPLATE

  return (
    <div className="text-center">
      <div className="text-sm font-bold mb-2 text-gray-900">{chordName}</div>
      <svg width={width} height={height} className="mx-auto">
        {/* Cordas verticais - sempre 6 */}
        {Array.from({ length: stringCount }, (_, i) => (
          <line
            key={`string-${i}`}
            x1={startX + i * stringSpacing}
            y1={startY}
            x2={startX + i * stringSpacing}
            y2={startY + (fretCount - 1) * fretSpacing}
            stroke="#333"
            strokeWidth="1.5"
          />
        ))}
        
        {/* Trastes horizontais - sempre 4 */}
        {Array.from({ length: fretCount }, (_, i) => (
          <line
            key={`fret-${i}`}
            x1={startX}
            y1={startY + i * fretSpacing}
            x2={startX + (stringCount - 1) * stringSpacing}
            y2={startY + i * fretSpacing}
            stroke="#333"
            strokeWidth={i === 0 ? "3" : "1.5"}
          />
        ))}
        
        {/* Pestana - apenas se houver */}
        {chordData.barre && chordData.barreFret && (
          <rect
            x={startX}
            y={startY + (chordData.barreFret - 1) * fretSpacing - 4}
            width={(stringCount - 1) * stringSpacing}
            height="8"
            fill="#22c55e"
            rx="4"
          />
        )}
        
        {/* Dedos - renderizar todos os dedos, incluindo os da pestana */}
        {chordData.frets.map((fret, stringIndex) => {
          if (fret === 0) return null
          
          return (
            <g key={`finger-${stringIndex}`}>
              <circle
                cx={startX + stringIndex * stringSpacing}
                cy={startY + (fret - 1) * fretSpacing}
                r="7"
                fill="#22c55e"
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={startX + stringIndex * stringSpacing}
                y={startY + (fret - 1) * fretSpacing + 3}
                textAnchor="middle"
                fontSize="9"
                fill="white"
                fontWeight="bold"
              >
                {fret}
              </text>
            </g>
          )
        })}
        
        {/* Cordas soltas (O) */}
        {chordData.openStrings.map((isOpen, stringIndex) => {
          if (!isOpen) return null
          
          return (
            <text
              key={`open-${stringIndex}`}
              x={startX + stringIndex * stringSpacing}
              y={startY - 5}
              textAnchor="middle"
              fontSize="12"
              fill="#333"
              fontWeight="bold"
            >
              O
            </text>
          )
        })}
        
        {/* Cordas não tocadas (X) */}
        {chordData.mutedStrings.map((isMuted, stringIndex) => {
          if (!isMuted) return null
          
          return (
            <text
              key={`muted-${stringIndex}`}
              x={startX + stringIndex * stringSpacing}
              y={startY - 5}
              textAnchor="middle"
              fontSize="12"
              fill="#333"
              fontWeight="bold"
            >
              X
            </text>
          )
        })}
      </svg>
    </div>
  )
}
