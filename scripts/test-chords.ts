import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testChords() {
  console.log('🎸 Testando funcionalidade de acordes...')

  try {
    // Buscar uma música com acordes
    const song = await prisma.song.findFirst({
      include: {
        artist: true,
        chords: true
      }
    })

    if (!song) {
      console.log('❌ Nenhuma música encontrada')
      return
    }

    console.log(`✅ Música encontrada: ${song.title} - ${song.artist.name}`)
    console.log(`📊 Acordes disponíveis: ${song.chords.length}`)
    
    song.chords.forEach(chord => {
      console.log(`🎵 ${chord.name}:`)
      console.log(`   - Frets: ${chord.frets}`)
      console.log(`   - Fingering: ${chord.fingering}`)
      console.log(`   - Barre: ${chord.barre}`)
      console.log(`   - Barre Fret: ${chord.barreFret}`)
    })

    // Testar API
    const response = await fetch('http://localhost:3001/api/songs')
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ API funcionando: ${data.songs.length} músicas encontradas`)
    } else {
      console.log('❌ API não está funcionando')
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testChords()
