'use client'

interface CifraClubChordDiagramProps {
  chordName: string
  chordData: {
    frets: number[]
    fingering: string
  }
}

export default function CifraClubChordDiagram({ chordName, chordData }: CifraClubChordDiagramProps) {
  // Verificar se chordData existe e tem frets
  if (!chordData || !chordData.frets || chordData.frets.length === 0) {
    return (
      <div className="text-center">
        <div className="text-sm font-bold mb-2">{chordName}</div>
        <div className="text-xs text-gray-500">Dados do acorde não disponíveis</div>
      </div>
    )
  }

  // Verificar se há pestana (múltiplos dedos na mesma casa)
  const hasBarre = () => {
    const nonZeroFrets = chordData.frets.filter(fret => fret > 0)
    if (nonZeroFrets.length < 2) return false
    
    const fretCounts: { [key: number]: number } = {}
    nonZeroFrets.forEach(fret => {
      fretCounts[fret] = (fretCounts[fret] || 0) + 1
    })
    
    return Object.values(fretCounts).some(count => count >= 2)
  }

  const barreFret = hasBarre() ? chordData.frets.find(fret => fret > 0) : null

  return (
    <div className="text-center">
      <div className="text-sm font-bold mb-2 text-gray-900">{chordName}</div>
      <svg width="90" height="110" className="mx-auto">
          {/* Cordas verticais (6 cordas) */}
          {[0, 1, 2, 3, 4, 5].map((string) => (
            <line
              key={string}
              x1={15 + string * 12}
              y1={20}
              x2={15 + string * 12}
              y2={80}
              stroke="#333"
              strokeWidth="1.5"
            />
          ))}
          
          {/* Trastes horizontais (4 trastes) */}
          {[0, 1, 2, 3].map((fret) => (
            <line
              key={fret}
              x1={15}
              y1={20 + fret * 20}
              x2={75}
              y2={20 + fret * 20}
              stroke="#333"
              strokeWidth={fret === 0 ? "3" : "1.5"}
            />
          ))}
          
          {/* Pestana (barre) */}
          {barreFret && (
            <rect
              x={15}
              y={20 + (barreFret - 1) * 20 - 4}
              width={60}
              height="8"
              fill="#22c55e"
              rx="4"
            />
          )}
          
          {/* Dedos */}
          {chordData.frets.map((fret, stringIndex) => {
            if (fret === 0) return null
            
            return (
              <g key={stringIndex}>
                <circle
                  cx={15 + stringIndex * 12}
                  cy={20 + (fret - 1) * 20}
                  r="7"
                  fill="#22c55e"
                  stroke="#fff"
                  strokeWidth="2"
                />
                <text
                  x={15 + stringIndex * 12}
                  y={20 + (fret - 1) * 20 + 3}
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
          
          {/* Cordas soltas (0) */}
          {chordData.frets.map((fret, stringIndex) => {
            if (fret === 0) {
              return (
                <text
                  key={stringIndex}
                  x={15 + stringIndex * 12}
                  y={12}
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
          {chordData.frets.map((fret, stringIndex) => {
            if (fret === -1) {
              return (
                <text
                  key={stringIndex}
                  x={15 + stringIndex * 12}
                  y={12}
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
