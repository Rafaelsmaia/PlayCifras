import axios from 'axios'

// API de acordes seguindo a documentação oficial do Uberchord
const UBERCHORD_API_BASE_URL = 'https://api.uberchord.com/v1/chords'

export interface UberchordResponse {
  chordName: string
  strings: string  // Formato: "1 X 2 2 1 0"
  fingering: string // Formato: "1 X 3 4 2 X"
}

export const getChordDataFromApi = async (chordName: string): Promise<UberchordResponse | null> => {
  try {
    // Converte o nome do acorde para o formato da API
    const apiChordName = chordName
      .replace(/#/g, '_')
      .replace(/♭/g, 'b')
      .replace(/maj/g, 'maj')
      .replace(/m/g, 'm')
    
    const response = await axios.get(`${UBERCHORD_API_BASE_URL}/${apiChordName}`)
    
    if (response.data) {
      return {
        chordName: response.data.chordName,
        strings: response.data.strings,
        fingering: response.data.fingering
      }
    }
    
    return null
  } catch (error) {
    console.error(`Erro ao buscar acorde ${chordName} da API:`, error)
    return getChordFallback(chordName)
  }
}

// Fallback com dados corretos seguindo o formato da API
export const getChordFallback = (chordName: string): UberchordResponse | null => {
  const fallbackChords: Record<string, UberchordResponse> = {
    'F': {
      chordName: 'F,,,',
      strings: '1 1 2 2 1 1',
      fingering: '1 1 2 2 1 1'
    },
    'C': {
      chordName: 'C,,,',
      strings: '0 1 0 2 1 0',
      fingering: 'X 1 X 2 3 X'
    },
    'G': {
      chordName: 'G,,,',
      strings: '3 0 0 0 2 3',
      fingering: '3 X X X 2 3'
    },
    'Am': {
      chordName: 'A,m,,',
      strings: '0 0 2 2 1 0',
      fingering: 'X X 2 2 1 X'
    },
    'Em': {
      chordName: 'E,m,,',
      strings: '0 2 2 0 0 0',
      fingering: 'X 2 2 X X X'
    },
    'D': {
      chordName: 'D,,,',
      strings: '2 0 0 2 3 2',
      fingering: '2 X X 1 3 2'
    },
    'A': {
      chordName: 'A,,,',
      strings: '0 0 2 2 2 0',
      fingering: 'X X 2 2 2 X'
    },
    'E': {
      chordName: 'E,,,',
      strings: '0 0 1 2 2 0',
      fingering: 'X X 1 2 2 X'
    }
  }

  return fallbackChords[chordName] || null
}
