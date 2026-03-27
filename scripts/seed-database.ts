import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar artistas
  const artists = [
    {
      name: 'Tom Jobim',
      slug: 'tom-jobim',
      bio: 'Antônio Carlos Jobim, conhecido como Tom Jobim, foi um compositor, maestro, pianista, cantor, arranjador e violonista brasileiro.',
      image: 'https://example.com/tom-jobim.jpg'
    },
    {
      name: 'Adoniran Barbosa',
      slug: 'adoniran-barbosa',
      bio: 'João Rubinato, mais conhecido pelo nome artístico Adoniran Barbosa, foi um compositor, cantor, humorista e ator brasileiro.',
      image: 'https://example.com/adoniran-barbosa.jpg'
    },
    {
      name: 'Chico Buarque',
      slug: 'chico-buarque',
      bio: 'Francisco Buarque de Hollanda, mais conhecido como Chico Buarque, é um músico, dramaturgo e escritor brasileiro.',
      image: 'https://example.com/chico-buarque.jpg'
    },
    {
      name: 'Toquinho',
      slug: 'toquinho',
      bio: 'Antônio Pecci Filho, mais conhecido como Toquinho, é um violonista, cantor e compositor brasileiro.',
      image: 'https://example.com/toquinho.jpg'
    }
  ]

  for (const artistData of artists) {
    const artist = await prisma.artist.upsert({
      where: { name: artistData.name },
      update: {},
      create: artistData
    })
    console.log(`✅ Artista criado: ${artist.name}`)
  }

  // Criar músicas
  const songs = [
    {
      title: 'Garota de Ipanema',
      slug: 'garota-de-ipanema-tom-jobim',
      artistName: 'Tom Jobim',
      key: 'F',
      tempo: 120,
      difficulty: 'Fácil',
      content: `[Intro] F C7 F C7

[Verso 1]
F          C7
Olha que coisa mais linda
F          C7
Mais cheia de graça
F          C7
É ela menina
F          C7
Que vem e que passa
F          C7
Num doce balanço
F          C7
A caminho do mar

[Refrão]
Dm          Bb
Moça do corpo dourado
Dm          Bb
Do sol de Ipanema
Dm          Bb
O seu balançado
Dm          Bb
É mais que um poema
Dm          Bb
É a coisa mais linda
Dm          Bb
Que eu já vi passar

[Verso 2]
F          C7
Ah, por que estou tão sozinho
F          C7
Ah, por que tudo é tão triste
F          C7
Ah, a beleza que existe
F          C7
A beleza que não é só minha
F          C7
Que também passa sozinha

[Refrão]
Dm          Bb
Moça do corpo dourado
Dm          Bb
Do sol de Ipanema
Dm          Bb
O seu balançado
Dm          Bb
É mais que um poema
Dm          Bb
É a coisa mais linda
Dm          Bb
Que eu já vi passar`,
      tags: ['bossa-nova', 'samba', 'classica', 'violao'],
      chords: [
        {
          name: 'F',
          frets: [1, 1, 2, 2, 1, 1],
          fingering: [1, 1, 2, 2, 1, 1],
          barre: true,
          barreFret: 1,
          openStrings: [false, false, false, false, false, false],
          mutedStrings: [false, false, false, false, false, false]
        },
        {
          name: 'C7',
          frets: [0, 1, 0, 2, 1, 0],
          fingering: [0, 1, 0, 2, 1, 0],
          barre: false,
          openStrings: [true, false, true, false, false, true],
          mutedStrings: [false, false, false, false, false, false]
        },
        {
          name: 'Dm',
          frets: [1, 3, 2, 0, 1, 1],
          fingering: [1, 3, 2, 0, 1, 1],
          barre: false,
          openStrings: [false, false, false, true, false, false],
          mutedStrings: [false, false, false, false, false, false]
        },
        {
          name: 'Bb',
          frets: [1, 1, 3, 3, 3, 1],
          fingering: [1, 1, 2, 3, 4, 1],
          barre: true,
          barreFret: 1,
          openStrings: [false, false, false, false, false, false],
          mutedStrings: [false, false, false, false, false, false]
        }
      ]
    },
    {
      title: 'Trem das Onze',
      slug: 'trem-das-onze-adoniran-barbosa',
      artistName: 'Adoniran Barbosa',
      key: 'C',
      tempo: 100,
      difficulty: 'Médio',
      content: `[Intro] C G Am F

[Verso 1]
C              G
Não posso ficar nem mais um minuto com você
Am             F
Sinto muito amor, mas não pode ser
C              G
Moro em Jaçanã, se eu perder esse trem
Am             F
Que sai agora às onze horas
C              G
Só amanhã de manhã

[Refrão]
C              G
Mas não é por isso, não
Am             F
Que eu não vou me embora
C              G
Vou ficar aqui
Am             F
Pra te fazer feliz
C              G
Mas o trem das onze
Am             F
Não pode esperar

[Verso 2]
C              G
Adeus, adeus, adeus
Am             F
Vou me embora
C              G
Adeus, adeus, adeus
Am             F
Vou me embora
C              G
Mas o trem das onze
Am             F
Não pode esperar`,
      tags: ['samba', 'classica', 'violao', 'tradicional'],
      chords: [
        {
          name: 'C',
          frets: [0, 1, 0, 2, 1, 0],
          fingering: [0, 1, 0, 2, 1, 0],
          barre: false,
          openStrings: [true, false, true, false, false, true],
          mutedStrings: [false, false, false, false, false, false]
        },
        {
          name: 'G',
          frets: [3, 0, 0, 0, 2, 3],
          fingering: [3, 0, 0, 0, 2, 3],
          barre: false,
          openStrings: [false, true, true, true, false, false],
          mutedStrings: [false, false, false, false, false, false]
        },
        {
          name: 'Am',
          frets: [0, 0, 2, 2, 1, 0],
          fingering: [0, 0, 2, 2, 1, 0],
          barre: false,
          openStrings: [true, true, false, false, false, true],
          mutedStrings: [false, false, false, false, false, false]
        },
        {
          name: 'F',
          frets: [1, 1, 2, 2, 1, 1],
          fingering: [1, 1, 2, 2, 1, 1],
          barre: true,
          barreFret: 1,
          openStrings: [false, false, false, false, false, false],
          mutedStrings: [false, false, false, false, false, false]
        }
      ]
    }
  ]

  for (const songData of songs) {
    const artist = await prisma.artist.findUnique({
      where: { name: songData.artistName }
    })

    if (artist) {
      const song = await prisma.song.create({
        data: {
          title: songData.title,
          slug: songData.slug,
          artistId: artist.id,
          key: songData.key,
          tempo: songData.tempo,
          difficulty: songData.difficulty,
          content: songData.content,
          tags: JSON.stringify(songData.tags),
          chords: {
            create: songData.chords.map(chord => ({
              name: chord.name,
              frets: JSON.stringify(chord.frets),
              fingering: JSON.stringify(chord.fingering),
              barre: chord.barre,
              barreFret: chord.barreFret,
              openStrings: JSON.stringify(chord.openStrings),
              mutedStrings: JSON.stringify(chord.mutedStrings)
            }))
          }
        }
      })
      console.log(`✅ Música criada: ${song.title}`)
    }
  }

  console.log('🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
