/**
 * Copia o catálogo do Postgres local → Neon (produção).
 *
 * Uso:
 *   npx tsx scripts/copy-local-to-neon.ts
 *
 * Lê local de .env / .env.local (DATABASE_URL).
 * Lê Neon de .env.production.local (DATABASE_URL + DIRECT_URL).
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

const localEnv = {
  ...loadEnvFile('.env'),
  ...loadEnvFile('.env.local')
}
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

const local = new PrismaClient({
  datasources: { db: { url: localUrl } }
})
const neon = new PrismaClient({
  datasources: { db: { url: neonUrl } }
})

const CHUNK = 100

async function copyTable<T extends Record<string, unknown>>(
  label: string,
  fetchAll: () => Promise<T[]>,
  insertChunk: (rows: T[]) => Promise<unknown>
) {
  const rows = await fetchAll()
  console.log(`→ ${label}: ${rows.length}`)
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK)
    await insertChunk(slice)
    if (rows.length > CHUNK) {
      process.stdout.write(
        `\r   ${Math.min(i + CHUNK, rows.length)}/${rows.length}`
      )
    }
  }
  if (rows.length > CHUNK) process.stdout.write('\n')
}

async function main() {
  console.log('Origem (local):', localUrl.replace(/:[^:@]+@/, ':****@'))
  console.log('Destino (Neon):', neonUrl.replace(/:[^:@]+@/, ':****@'))

  const [ls, la, lg] = await Promise.all([
    local.song.count(),
    local.artist.count(),
    local.genre.count()
  ])
  console.log(`Local: ${ls} músicas, ${la} artistas, ${lg} gêneros`)

  console.log('\nLimpando Neon (catálogo)...')
  // Ordem por FKs
  await neon.userFavorite.deleteMany()
  await neon.chord.deleteMany()
  await neon.song.deleteMany()
  await neon.artist.deleteMany()
  await neon.genre.deleteMany()
  await neon.chordDictionary.deleteMany()

  await copyTable(
    'genres',
    () => local.genre.findMany(),
    (rows) => neon.genre.createMany({ data: rows })
  )

  await copyTable(
    'artists',
    () => local.artist.findMany(),
    (rows) => neon.artist.createMany({ data: rows })
  )

  await copyTable(
    'songs',
    () => local.song.findMany(),
    (rows) => neon.song.createMany({ data: rows })
  )

  await copyTable(
    'chords',
    () => local.chord.findMany(),
    (rows) => neon.chord.createMany({ data: rows })
  )

  await copyTable(
    'chord_dictionary',
    () => local.chordDictionary.findMany(),
    (rows) => neon.chordDictionary.createMany({ data: rows })
  )

  // Usuários / favoritos (opcional, se existirem)
  const users = await local.user.findMany()
  if (users.length) {
    console.log(`→ users: ${users.length}`)
    await neon.userFavorite.deleteMany()
    await neon.session.deleteMany()
    await neon.account.deleteMany()
    await neon.user.deleteMany()
    await neon.user.createMany({ data: users })

    const accounts = await local.account.findMany()
    if (accounts.length) {
      await neon.account.createMany({ data: accounts })
      console.log(`→ accounts: ${accounts.length}`)
    }
    const sessions = await local.session.findMany()
    if (sessions.length) {
      await neon.session.createMany({ data: sessions })
      console.log(`→ sessions: ${sessions.length}`)
    }
    const favorites = await local.userFavorite.findMany()
    if (favorites.length) {
      await neon.userFavorite.createMany({ data: favorites })
      console.log(`→ favorites: ${favorites.length}`)
    }
  }

  const [ns, na, ng, nc] = await Promise.all([
    neon.song.count(),
    neon.artist.count(),
    neon.genre.count(),
    neon.chordDictionary.count()
  ])
  console.log('\nNeon agora:')
  console.log(
    JSON.stringify(
      { songs: ns, artists: na, genres: ng, chordDictionary: nc },
      null,
      2
    )
  )

  if (ns !== ls || na !== la) {
    console.warn('⚠ Contagens diferem do local — revise.')
    process.exitCode = 1
  } else {
    console.log('\n✓ Cópia concluída.')
  }
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
