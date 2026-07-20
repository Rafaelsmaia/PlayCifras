/**
 * Importa cifras do Cifra Club para o Postgres local.
 *
 * Uso:
 *   npx tsx scripts/import-cifraclub.ts
 *   npx tsx scripts/import-cifraclub.ts --limit=20
 *   npx tsx scripts/import-cifraclub.ts legiao-urbana/tempo-perdido
 *
 * Variáveis:
 *   REQUEST_DELAY_MS — pausa entre músicas (default: 800)
 *   LIMIT — máximo de itens do ranking (default: 100)
 *
 * Aviso: scraping de terceiros — use para popular o banco local / estudo.
 */
import axios from 'axios'
import * as cheerio from 'cheerio'
import { prisma } from '../lib/database'

const BASE = 'https://www.cifraclub.com.br'
const DELAY_MS = Math.max(300, parseInt(process.env.REQUEST_DELAY_MS || '800', 10) || 800)

function getLimit(): number {
  const arg = process.argv.find((a) => a.startsWith('--limit='))
  if (arg) return Math.max(1, parseInt(arg.split('=')[1] || '100', 10) || 100)
  const env = parseInt(process.env.LIMIT || '100', 10)
  return Number.isFinite(env) && env > 0 ? env : 100
}

const http = axios.create({
  timeout: 45000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    Accept: 'text/html,application/xhtml+xml'
  }
})

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

type RankingItem = {
  artistSlug: string
  songSlug: string
  path: string
}

/** Extrai links artista/musica do ranking mais-acessadas. */
async function fetchTopPaths(limit: number): Promise<RankingItem[]> {
  const { data } = await http.get(`${BASE}/mais-acessadas/`)
  const $ = cheerio.load(data)
  const items: RankingItem[] = []
  const seen = new Set<string>()

  const blocklist = new Set([
    'mais-acessadas',
    'novidades',
    'aprenda',
    'assinatura',
    'letra',
    'videos',
    'cifras',
    'academy',
    'blog',
    'forum',
    'assinantes'
  ])

  // Ranking usa <li><a href="/artista/musica/"> com .top-number
  $('li a[href]').each((_, el) => {
    if (items.length >= limit) return false
    const $a = $(el)
    if (!$a.find('.top-number, .top-txt_primary, .song-verified--ellipsis').length) {
      // ainda aceita se o texto parecer título de música no ol principal
      if (!$a.closest('ol').length) return
    }
    let href = ($a.attr('href') || '').split('?')[0].split('#')[0]
    if (!href.startsWith('/')) return
    href = href.replace(/\/$/, '')
    const m = href.match(/^\/([a-z0-9-]+)\/([a-z0-9-]+)$/i)
    if (!m) return
    const artistSlug = m[1]
    const songSlug = m[2]
    if (blocklist.has(artistSlug)) return
    const key = `${artistSlug}/${songSlug}`
    if (seen.has(key)) return
    seen.add(key)
    items.push({ artistSlug, songSlug, path: key })
    return undefined
  })

  return items.slice(0, limit)
}

type SongPayload = {
  artistName: string
  songTitle: string
  artistSlug: string
  songSlug: string
  content: string
  key: string | null
}

async function fetchSong(artistSlug: string, songSlug: string): Promise<SongPayload | null> {
  const url = `${BASE}/${artistSlug}/${songSlug}/`
  const { data, status } = await http.get(url, { validateStatus: () => true })
  if (status !== 200 || typeof data !== 'string') {
    console.warn('HTTP', status, url)
    return null
  }

  const $ = cheerio.load(data)
  const preEl = $('.cifra_cnt pre, pre').first()
  let content = preEl.text()
  if (!content || content.trim().length < 20) {
    console.warn('Sem <pre> útil:', url)
    return null
  }
  content = decodeHtmlEntities(content).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()

  const songTitle =
    $('h1.t1, h1[class*="title"], .cifra h1').first().text().trim() ||
    songSlug.replace(/-/g, ' ')
  const artistName =
    $('h2.t3, h2[class*="artist"], .cifra h2 a, a.artist').first().text().trim() ||
    artistSlug.replace(/-/g, ' ')

  const keyMatch =
    content.match(/^\s*Tom:\s*([^\n(]+)/m) ||
    content.match(/\n\s*Tom:\s*([^\n(]+)/)
  const key = keyMatch ? keyMatch[1].trim().split(/\s+/)[0] : null

  return {
    artistName,
    songTitle,
    artistSlug,
    songSlug,
    content,
    key
  }
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

async function upsertSong(payload: SongPayload): Promise<'created' | 'updated'> {
  let artist = await prisma.artist.findFirst({
    where: {
      OR: [
        { slug: payload.artistSlug },
        { name: { equals: payload.artistName, mode: 'insensitive' } }
      ]
    }
  })

  if (!artist) {
    const slug = await uniqueArtistSlug(payload.artistSlug || slugify(payload.artistName))
    artist = await prisma.artist.create({
      data: { name: payload.artistName, slug }
    })
  }

  const existing = await prisma.song.findFirst({
    where: {
      artistId: artist.id,
      OR: [
        { slug: { contains: payload.songSlug } },
        { title: { equals: payload.songTitle, mode: 'insensitive' } }
      ]
    }
  })

  if (existing) {
    await prisma.song.update({
      where: { id: existing.id },
      data: {
        title: payload.songTitle,
        content: payload.content,
        key: payload.key,
        isPublic: true
      }
    })
    return 'updated'
  }

  const baseSlug = `${slugify(payload.songTitle)}-${artist.slug}`
  const slug = await uniqueSongSlug(baseSlug)
  await prisma.song.create({
    data: {
      title: payload.songTitle,
      slug,
      artistId: artist.id,
      content: payload.content,
      key: payload.key,
      tags: '[]',
      isPublic: true
    }
  })
  return 'created'
}

async function main() {
  const single = process.argv.find((a) => a.includes('/') && !a.startsWith('-'))
  const limit = getLimit()

  console.log('Cifra Club → banco local')
  console.log('Delay:', DELAY_MS, 'ms')

  let targets: RankingItem[] = []
  if (single) {
    const [artistSlug, songSlug] = single.replace(/^\/+|\/+$/g, '').split('/')
    if (!artistSlug || !songSlug) {
      console.error('Uso single: npx tsx scripts/import-cifraclub.ts artista/musica')
      process.exit(1)
    }
    targets = [{ artistSlug, songSlug, path: `${artistSlug}/${songSlug}` }]
  } else {
    console.log('Buscando ranking (limit', limit + ')…')
    targets = await fetchTopPaths(limit)
    console.log('Itens no ranking:', targets.length)
  }

  let created = 0
  let updated = 0
  let failed = 0

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]
    process.stdout.write(`[${i + 1}/${targets.length}] ${t.path} … `)
    try {
      const song = await fetchSong(t.artistSlug, t.songSlug)
      if (!song) {
        failed += 1
        console.log('falhou')
      } else {
        const op = await upsertSong(song)
        if (op === 'created') created += 1
        else updated += 1
        console.log(op, '—', song.songTitle, '/', song.artistName)
      }
    } catch (e) {
      failed += 1
      console.log('erro', e instanceof Error ? e.message : e)
    }
    if (i < targets.length - 1) await sleep(DELAY_MS)
  }

  console.log('Concluído.', { created, updated, failed, total: targets.length })
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
