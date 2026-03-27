'use client'

interface Chord {
  name: string
  fingering: string
  frets: number[]
}

interface ChordDiagramProps {
  chord: Chord
}

export default function ChordDiagram({ chord }: ChordDiagramProps) {
  const strings = [6, 5, 4, 3, 2, 1] // Cordas do violão (6ª a 1ª)
  const frets = [0, 1, 2, 3, 4] // Trastes mostrados

  return (
    <div className="text-center">
      <div className="text-sm font-semibold mb-2">{chord.name}</div>
      <div className="relative w-16 h-20 mx-auto">
        {/* Cordas verticais */}
        {strings.map((string, index) => (
          <div
            key={string}
            className="absolute w-px bg-gray-400"
            style={{
              left: `${(index * 20) + 8}px`,
              top: '8px',
              height: '64px'
            }}
          />
        ))}
        
        {/* Trastes horizontais */}
        {frets.map((fret, index) => (
          <div
            key={fret}
            className="absolute h-px bg-gray-400"
            style={{
              top: `${8 + (index * 16)}px`,
              left: '8px',
              width: '80px'
            }}
          />
        ))}
        
        {/* Dedos */}
        {chord.frets.map((fret, stringIndex) => {
          if (fret === 0) return null
          
          return (
            <div
              key={stringIndex}
              className="absolute w-3 h-3 bg-cifra-green rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{
                left: `${(stringIndex * 20) + 6.5}px`,
                top: `${8 + ((fret - 1) * 16) - 6}px`
              }}
            >
              {fret}
            </div>
          )
        })}
        
        {/* Cordas soltas (0) ou não tocadas (X) */}
        {chord.frets.map((fret, stringIndex) => {
          if (fret === 0) {
            return (
              <div
                key={stringIndex}
                className="absolute text-xs text-gray-600 font-bold"
                style={{
                  left: `${(stringIndex * 20) + 6}px`,
                  top: '2px'
                }}
              >
                O
              </div>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
