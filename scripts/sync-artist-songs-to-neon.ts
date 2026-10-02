/**
 * Sobe as músicas de um artista do Postgres local → Neon (upsert por slug).
 *
 * Uso:
 *   npx tsx scripts/sync-artist-songs-to-neon.ts fernanda-brum
 */
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

function loadEnvFile(file: string): Record<string, string> {
  const full = path.join(process.cwd(), file)
  if (!existsSync(full)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(full, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const localEnv = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') }
const neonEnv = loadEnvFile('.env.production.local')
const localUrl = localEnv.DATABASE_URL
const neonUrl = neonEnv.DIRECT_URL || neonEnv.DATABASE_URL

if (!localUrl?.includes('localhost') && !localUrl?.includes('127.0.0.1')) {
  console.error('Abortado: DATABASE_URL local não aponta para localhost.')
  process.exit(1)
}
if (!neonUrl || neonUrl.includes('localhost')) {
  console.error('Abortado: .env.production.local sem URL Neon válida.')
  process.exit(1)
}

const artistSlug = process.argv[2]?.trim()
if (!artistSlug) {
  console.error('Uso: npx tsx scripts/sync-artist-songs-to-neon.ts <artist-slug>')
  process.exit(1)
}

const local = new PrismaClient({ datasources: { db: { url: localUrl } } })
const neon = new PrismaClient({ datasources: { db: { url: neonUrl } } })

async function main() {
  const localArtist = await local.artist.findUnique({
    where: { slug: artistSlug },
    include: {
      songs: {
        where: { isPublic: true },
        orderBy: { title: 'asc' },
      },
    },
  })
  if (!localArtist) {
    console.error('Artista não encontrado no local:', artistSlug)
    process.exit(1)
  }

  let neonArtist = await neon.artist.findUnique({ where: { slug: artistSlug } })
  if (!neonArtist) {
    neonArtist = await neon.artist.create({
      data: {
        id: localArtist.id,
        name: localArtist.name,
        slug: localArtist.slug,
        bio: localArtist.bio,
        image: localArtist.image,
        createdAt: localArtist.createdAt,
        updatedAt: localArtist.updatedAt,
      },
    })
    console.log('Artista criado no Neon:', neonArtist.name)
  } else if (localArtist.image && neonArtist.image !== localArtist.image) {
    neonArtist = await neon.artist.update({
      where: { id: neonArtist.id },
      data: { image: localArtist.image, name: localArtist.name },
    })
  }

  let created = 0
  let updated = 0

  for (const song of localArtist.songs) {
    const existing = await neon.song.findUnique({ where: { slug: song.slug } })
    const data = {
      title: song.title,
      content: song.content,
      key: song.key,
      tempo: song.tempo,
      difficulty: song.difficulty,
      tags: song.tags,
      youtubeVideoId: song.youtubeVideoId,
      isPublic: song.isPublic,
      artistId: neonArtist.id,
      genreId: song.genreId,
    }

    if (existing) {
      await neon.song.update({
        where: { id: existing.id },
        data: {
          ...data,
          // não zera views/likes de produção
        },
      })
      updated += 1
      console.log('updated', song.title)
    } else {
      await neon.song.create({
        data: {
          id: song.id,
          slug: song.slug,
          views: song.views,
          likes: song.likes,
          createdAt: song.createdAt,
          updatedAt: song.updatedAt,
          ...data,
        },
      })
      created += 1
      console.log('created', song.title)
    }
  }

  const neonCount = await neon.song.count({
    where: { artistId: neonArtist.id, isPublic: true },
  })
  console.log('Concluído.', {
    localSongs: localArtist.songs.length,
    created,
    updated,
    neonSongs: neonCount,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await local.$disconnect()
    await neon.$disconnect()
  })
