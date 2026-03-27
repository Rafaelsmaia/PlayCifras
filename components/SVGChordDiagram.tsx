'use client'

interface SVGChordDiagramProps {
  chordName: string
  chordData: {
    frets: number[]
    fingering: string
  }
}

export default function SVGChordDiagram({ chordName, chordData }: SVGChordDiagramProps) {
  const width = 100
  const height = 120
  const stringSpacing = 16
  const fretSpacing = 20
  const startX = 15
  const startY = 25

  // Verificar se chordData existe e tem frets
  if (!chordData || !chordData.frets || chordData.frets.length === 0) {
    return (
      <div className="text-center">
        <div className="text-sm font-bold mb-2">{chordName}</div>
        <div className="text-xs text-gray-500">Dados do acorde não disponíveis</div>
      </div>
    )
  }

  // Verificar se há pestana
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
      <div className="text-sm font-bold mb-2">{chordName}</div>
      <svg width={width} height={height} className="mx-auto">
        {/* Cordas verticais */}
        {[0, 1, 2, 3, 4, 5].map((string) => (
          <line
            key={string}
            x1={startX + string * stringSpacing}
            y1={startY}
            x2={startX + string * stringSpacing}
            y2={startY + 4 * fretSpacing}
            stroke="#666"
            strokeWidth="1.5"
          />
        ))}
        
        {/* Trastes horizontais */}
        {[0, 1, 2, 3, 4].map((fret) => (
          <line
            key={fret}
            x1={startX}
            y1={startY + fret * fretSpacing}
            x2={startX + 5 * stringSpacing}
            y2={startY + fret * fretSpacing}
            stroke="#666"
            strokeWidth="1.5"
          />
        ))}
        
        {/* Pestana */}
        {barreFret && (
          <rect
            x={startX}
            y={startY + (barreFret - 1) * fretSpacing - 2}
            width={5 * stringSpacing}
            height="3"
            fill="#22c55e"
            rx="1.5"
          />
        )}
        
        {/* Dedos */}
        {chordData.frets.map((fret, stringIndex) => {
          if (fret === 0) return null
          
          return (
            <g key={stringIndex}>
              <circle
                cx={startX + stringIndex * stringSpacing}
                cy={startY + (fret - 1) * fretSpacing}
                r="6"
                fill="#22c55e"
                stroke="#fff"
                strokeWidth="1"
              />
              <text
                x={startX + stringIndex * stringSpacing}
                y={startY + (fret - 1) * fretSpacing + 2}
                textAnchor="middle"
                fontSize="8"
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
                x={startX + stringIndex * stringSpacing}
                y={startY - 3}
                textAnchor="middle"
                fontSize="10"
                fill="#666"
                fontWeight="bold"
              >
                O
              </text>
            )
          }
          return null
        })}
        
        {/* Cordas não tocadas (X) - se necessário */}
        {chordData.frets.map((fret, stringIndex) => {
          if (fret === -1) { // -1 indica corda não tocada
            return (
              <text
                key={stringIndex}
                x={startX + stringIndex * stringSpacing}
                y={startY - 3}
                textAnchor="middle"
                fontSize="10"
                fill="#666"
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
