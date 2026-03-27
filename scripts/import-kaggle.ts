/**
 * Importa chords_and_lyrics.csv (Kaggle) para Artist + Song no SQLite via Prisma.
 *
 * Uso:
 *   npx tsx scripts/import-kaggle.ts
 *   set MAX_ROWS=5000 && npx tsx scripts/import-kaggle.ts
 *   set KAGGLE_CSV_PATH=./data/kaggle-extract/chords_and_lyrics.csv
 *
 * Variáveis:
 *   KAGGLE_CSV_PATH - caminho do CSV (default: data/kaggle-extract/chords_and_lyrics.csv)
 *   MAX_ROWS        - máximo de músicas (default: 1000). Use 0 ou "all" para importar o CSV inteiro.
 */

import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse'
import { prisma } from '../lib/database'

const CSV_PATH =
  process.env.KAGGLE_CSV_PATH ||
  path.join(process.cwd(), 'data', 'kaggle-extract', 'chords_and_lyrics.csv')

function getMaxRows(): number {
  const v = process.env.MAX_ROWS
  if (v === undefined || v === '') return 1000
  const lower = v.toLowerCase()
  if (v === '0' || lower === 'all') return Number.POSITIVE_INFINITY
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n >= 0 ? n : 1000
}

const MAX_ROWS = getMaxRows()

function slugify(s: string, max = 80): string {
  const out = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
  return out || 'x'
}

function buildContent(row: Record<string, string>): string {
  const combined = row['chords&lyrics']?.trim()
  if (combined) return combined
  const c = row.chords?.trim() || ''
  const l = row.lyrics?.trim() || ''
  return [c, l].filter(Boolean).join('\n\n')
}

function tagsFromGenres(genres: string | undefined): string {
  if (!genres?.trim()) return '[]'
  try {
    const j = JSON.parse(genres)
    if (Array.isArray(j)) return JSON.stringify(j)
  } catch {
    /* string simples */
  }
  const parts = genres.split(',').map((s) => s.trim()).filter(Boolean)
  return JSON.stringify(parts)
}

async function uniqueArtistSlug(base: string): Promise<string> {
  let s = base
  let n = 0
  while (await prisma.artist.findUnique({ where: { slug: s } })) {
    n += 1
    s = `${base}-${n}`
  }
  return s
}

async function uniqueSongSlug(base: string): Promise<string> {
  let s = base
  let n = 0
  while (await prisma.song.findUnique({ where: { slug: s } })) {
    n += 1
    s = `${base}-${n}`
  }
  return s
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('Arquivo não encontrado:', CSV_PATH)
    console.error('Extraia o ZIP para data/kaggle-extract/ ou defina KAGGLE_CSV_PATH.')
    process.exit(1)
  }

  console.log('CSV:', CSV_PATH)
  console.log(
    'MAX_ROWS:',
    MAX_ROWS === Number.POSITIVE_INFINITY ? 'TODAS (sem limite)' : MAX_ROWS
  )

  const artistCache = new Map<string, { id: string; slug: string }>()
  let imported = 0
  let skipped = 0
  let rowNum = 0

  const stream = fs.createReadStream(CSV_PATH, { encoding: 'utf8' }).pipe(
    parse({
      columns: true,
      relax_column_count: true,
      relax_quotes: true,
      skip_empty_lines: true,
      bom: true,
    })
  )

  for await (const row of stream as AsyncIterable<Record<string, string>>) {
    if (Number.isFinite(MAX_ROWS) && imported >= MAX_ROWS) break
    rowNum += 1

    const artistName = (row.artist_name || '').trim()
    const songName = (row.song_name || '').trim()
    const content = buildContent(row)

    if (!artistName || !songName || !content) {
      skipped += 1
      continue
    }

    let art = artistCache.get(artistName)
    if (!art) {
      let artist = await prisma.artist.findUnique({ where: { name: artistName } })
      if (!artist) {
        const slug = await uniqueArtistSlug(slugify(artistName))
        artist = await prisma.artist.create({
          data: { name: artistName, slug },
        })
      }
      art = { id: artist.id, slug: artist.slug }
      artistCache.set(artistName, art)
    }

    const baseSlug = `${slugify(songName)}-${art.slug}`
    const slug = await uniqueSongSlug(baseSlug)

    try {
      await prisma.song.create({
        data: {
          title: songName,
          slug,
          artistId: art.id,
          content,
          tags: tagsFromGenres(row.genres),
          isPublic: true,
        },
      })
      imported += 1
      if (imported % 200 === 0) {
        console.log('Importadas:', imported, '(linha CSV ~', rowNum, ')')
      }
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
      if (code === 'P2002') skipped += 1
      else throw e
    }
  }

  console.log('Concluído.', { importadas: imported, ignoradas: skipped, linhasLidas: rowNum })
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
