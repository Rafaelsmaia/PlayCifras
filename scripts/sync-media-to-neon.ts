/**
 * Sincroniza Artist.image (e Song.youtubeVideoId) do Postgres local → Neon.
 * Não apaga dados — só atualiza campos por slug.
 *
 * Uso: npx tsx scripts/sync-media-to-neon.ts
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

const local = new PrismaClient({ datasources: { db: { url: localUrl } } })
const neon = new PrismaClient({ datasources: { db: { url: neonUrl } } })

async function main() {
  console.log('Local → Neon (imagens + clipes)')

  const artists = await local.artist.findMany({
    where: { AND: [{ image: { not: null } }, { NOT: { image: '' } }] },
    select: { slug: true, name: true, image: true },
  })

  let artistsUpdated = 0
  let artistsMissing = 0
  for (const a of artists) {
    const res = await neon.artist.updateMany({
      where: { slug: a.slug },
      data: { image: a.image },
    })
    if (res.count > 0) artistsUpdated += 1
    else artistsMissing += 1
  }

  const songs = await local.song.findMany({
    where: {
      AND: [{ youtubeVideoId: { not: null } }, { NOT: { youtubeVideoId: '' } }],
    },
    select: { slug: true, youtubeVideoId: true },
  })

  let songsUpdated = 0
  let songsMissing = 0
  for (const s of songs) {
    const res = await neon.song.updateMany({
      where: { slug: s.slug },
      data: { youtubeVideoId: s.youtubeVideoId },
    })
    if (res.count > 0) songsUpdated += 1
    else songsMissing += 1
  }

  const neonWithImg = await neon.artist.count({
    where: { AND: [{ image: { not: null } }, { NOT: { image: '' } }] },
  })
  const neonWithVideo = await neon.song.count({
    where: {
      AND: [{ youtubeVideoId: { not: null } }, { NOT: { youtubeVideoId: '' } }],
    },
  })

  console.log({
    artistsUpdated,
    artistsMissingOnNeon: artistsMissing,
    songsUpdated,
    songsMissingOnNeon: songsMissing,
    neonArtistsWithImage: neonWithImg,
    neonSongsWithVideo: neonWithVideo,
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
