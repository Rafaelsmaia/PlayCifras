/**
 * Importa cifras do Vagalume (uso educacional / arquivo pessoal).
 * Respeite os termos do site de origem e não reduza o delay entre requisições.
 *
 * Uso:
 *   npx tsx scripts/import-brazilian-songs.ts "Jorge & Mateus"
 *   set MAX_SONGS=10 && npx tsx scripts/import-brazilian-songs.ts "Legião Urbana"
 *   set REQUEST_DELAY_MS=2000 && npx tsx scripts/import-brazilian-songs.ts "Marília Mendonça"
 *   set VAGALUME_ARTIST_SLUG=legiao-urbana && npx tsx scripts/import-brazilian-songs.ts "Legiao Urbana"
 *
 * Variáveis:
 *   REQUEST_DELAY_MS — pausa entre cada HTTP (default: 1500)
 *   MAX_SONGS — máximo de músicas a processar (default: 0 = todas)
 *   VAGALUME_ARTIST_SLUG — slug exato no Vagalume (ex.: legiao-urbana), evita erro de encoding no terminal
 */
import axios from 'axios'
import * as cheerio from 'cheerio'
import { prisma } from '../lib/database'

const BASE = 'https://www.vagalume.com.br'

const REQUEST_DELAY_MS = Math.max(
  500,
  parseInt(process.env.REQUEST_DELAY_MS || '1500', 10) || 1500
)

function getMaxSongs(): number {
  const v = process.env.MAX_SONGS
  if (v === undefined || v === '') return 0
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const MAX_SONGS = getMaxSongs()

const http = axios.create({
  baseURL: BASE,
  timeout: 30000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Language': 'pt-BR,pt;q=0.9',
  },
  validateStatus: (s) => s >= 200 && s < 400,
})

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function slugify(s: string, max = 80): string {
  const out = s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
  return out || 'x'
}

function artistSlugCandidates(name: string): string[] {
  const raw = name.trim()
  const variants = [
    raw,
    raw.replace(/&/g, ' e '),
    raw.replace(/\s+e\s+/gi, ' '),
    raw.replace(/'/g, ''),
  ]
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of variants) {
    const s = slugify(v)
    if (!seen.has(s)) {
      seen.add(s)
      out.push(s)
    }
  }
  return out
}

/** Mapeia estilos do Vagalume para slug de Genre no banco (prisma/seed.ts). */
const VAGALUME_STYLE_TO_GENRE_SLUG: Record<string, string> = {
  Rock: 'rock',
  BRock: 'rock',
  'Pop/Rock': 'rock',
  'Pop rock': 'rock',
  Sertanejo: 'sertanejo',
  'Sertanejo universitário': 'sertanejo',
  Romântico: 'pop',
  Romantica: 'pop',
  MPB: 'mpb',
  Gospel: 'gospel',
  'Gospel/Religioso': 'gospel',
  Religioso: 'gospel',
  Forró: 'forro',
  Funk: 'funk',
  Pop: 'pop',
  Internacional: 'internacional',
  'Pop internacional': 'internacional',
}

function mapVagalumeStylesToGenreSlug(styles: string[]): string {
  for (const st of styles) {
    const slug = VAGALUME_STYLE_TO_GENRE_SLUG[st]
    if (slug) return slug
  }
  return 'outros'
}

function parseVDataStyles(html: string): string[] {
  const m = html.match(/style:\[(.*?)\],\s*discus/i)
  if (!m) return []
  const block = m[1]
  const names: string[] = []
  const re = /descr:"([^"]+)"/g
  let x: RegExpExecArray | null
  while ((x = re.exec(block)) !== null) names.push(x[1])
  return names
}

function parseArtistNameFromPage(html: string): string | null {
  const $ = cheerio.load(html)
  const t = $('#artHeaderTitle h1 a').first().text().trim()
  if (t) return t
  const t2 = $('h1 a[href$="/"]').first().text().trim()
  return t2 || null
}

function isArtistPage(html: string): boolean {
  return (
    html.includes('Letras de Músicas') ||
    html.includes('menuArtist') ||
    /id=artHeaderTitle/i.test(html)
  )
}

async function resolveArtistPage(artistQuery: string): Promise<{
  slug: string
  html: string
  displayName: string
}> {
  const slugOverride = process.env.VAGALUME_ARTIST_SLUG?.trim()
  if (slugOverride) {
    try {
      const res = await http.get(`/${slugOverride}/`)
      await sleep(REQUEST_DELAY_MS)
      if (res.status === 200 && typeof res.data === 'string') {
        const html = res.data
        if (isArtistPage(html)) {
          const displayName = parseArtistNameFromPage(html) || artistQuery.trim()
          return { slug: slugOverride, html, displayName }
        }
      }
    } catch {
      /* 404 ou rede */
    }
  }

  const candidates = artistSlugCandidates(artistQuery)
  for (const slug of candidates) {
    try {
      const res = await http.get(`/${slug}/`)
      await sleep(REQUEST_DELAY_MS)
      if (res.status !== 200 || typeof res.data !== 'string') continue
      const html = res.data
      if (!isArtistPage(html)) continue
      const displayName = parseArtistNameFromPage(html) || artistQuery.trim()
      return { slug, html, displayName }
    } catch {
      /* 404 ou rede */
    }
  }
  throw new Error(
    `Artista não encontrado no Vagalume (tentativas: ${candidates.join(', ')}). Ajuste o nome ou confira o slug em ${BASE}.`
  )
}

function collectSongPaths(html: string, artistSlug: string): string[] {
  const $ = cheerio.load(html)
  const prefix = `/${artistSlug}/`
  const skip = (path: string) =>
    /traducao|traducción|traduccion|discografia|fotos|biografia|relacionados|popularidade|\/news\//i.test(
      path
    )
  const paths = new Set<string>()
  $(`a[href^="${prefix}"]`).each((_, el) => {
    const href = ($(el).attr('href') || '').split('#')[0]
    if (!href.endsWith('.html')) return
    if (!href.startsWith(prefix)) return
    const rest = href.slice(prefix.length)
    if (rest.includes('/')) return
    if (skip(href)) return
    paths.add(href)
  })
  return Array.from(paths)
}

function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${BASE}${path.startsWith('/') ? '' : '/'}${path}`
}

function findCifradaPath(letraHtml: string): string | null {
  const $ = cheerio.load(letraHtml)
  let found: string | null = null
  $('#songTab a[href*="cifrada"], #songMenu a[href*="cifrada"]').each((_, el) => {
    const href = ($(el).attr('href') || '').split('#')[0]
    if (href.includes('cifrada') && href.endsWith('.html')) {
      found = href.startsWith('/') ? href : `/${href}`
      return false
    }
    return undefined
  })
  return found
}

function stripCifradaTitle(h1: string): string {
  return h1.replace(/\s*\(Cifrada\)\s*$/i, '').trim()
}

function cifradaHtmlToBracketed(htmlFragment: string): string {
  const $ = cheerio.load(`<div id="root">${htmlFragment}</div>`)
  const root = $('#root')
  root.find('b').each((_, el) => {
    const t = $(el).text().trim()
    $(el).replaceWith(`[${t}]`)
  })
  root.find('i').remove()
  root.find('br').each((_, el) => {
    $(el).replaceWith('\n')
  })
  let text = root.text()
  text = text
    .split('\n')
    .filter((line) => {
      const s = line.trim()
      if (!s) return true
      if (/^[EBGDA]\|/.test(s)) return false
      if (/^\s*[EBGDA]\s*\|/.test(s)) return false
      if (/^\s*Canto\s+\d+/i.test(s) && s.length < 40) return false
      if (/^Riff\s/i.test(s) && s.length < 30) return false
      return true
    })
    .join('\n')
  text = text.replace(/\n{3,}/g, '\n\n').trim()
  return text
}

function extractKeyFromContent(content: string): string | null {
  const intro = content.match(/Intro:\s*(\[[^\]]+\])/)
  if (intro) {
    const chord = intro[1].replace(/^\[|\]$/g, '')
    const root = chord.split('/')[0]?.trim()
    if (root) return root
  }
  const first = content.match(/\[([A-G][#b]?[^[\]]*)\]/)
  return first ? first[1].split('/')[0].trim() : null
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
  const artistArg = process.argv[2]?.trim()
  if (!artistArg) {
    console.error('Uso: npx tsx scripts/import-brazilian-songs.ts "<Nome do artista>"')
    process.exit(1)
  }

  console.log('Artista:', artistArg)
  console.log('Delay entre requisições:', REQUEST_DELAY_MS, 'ms')
  if (MAX_SONGS > 0) console.log('MAX_SONGS:', MAX_SONGS)

  const { slug: artistSlug, html: artistHtml, displayName } = await resolveArtistPage(artistArg)
  console.log('Encontrado:', displayName, `(${BASE}/${artistSlug}/)`)

  let paths = collectSongPaths(artistHtml, artistSlug)
  if (MAX_SONGS > 0) paths = paths.slice(0, MAX_SONGS)
  console.log('Músicas na lista:', paths.length)

  const artistSlugDb = await uniqueArtistSlug(slugify(displayName))
  const artist = await prisma.artist.upsert({
    where: { name: displayName },
    create: {
      name: displayName,
      slug: artistSlugDb,
    },
    update: {},
  })

  let imported = 0
  let skipped = 0

  for (const songPath of paths) {
    const letraUrl = songPath
    let letraHtml: string
    try {
      const r = await http.get(letraUrl)
      await sleep(REQUEST_DELAY_MS)
      letraHtml = typeof r.data === 'string' ? r.data : ''
      if (!letraHtml) {
        skipped += 1
        continue
      }
    } catch {
      skipped += 1
      continue
    }

    const cifradaPath = findCifradaPath(letraHtml)
    if (!cifradaPath) {
      console.warn('Sem cifra no Vagalume, ignorando:', letraUrl)
      skipped += 1
      continue
    }

    let cifradaHtml: string
    try {
      const r2 = await http.get(cifradaPath)
      await sleep(REQUEST_DELAY_MS)
      cifradaHtml = typeof r2.data === 'string' ? r2.data : ''
      if (!cifradaHtml) {
        skipped += 1
        continue
      }
    } catch {
      skipped += 1
      continue
    }

    const $c = cheerio.load(cifradaHtml)
    const lyricsBox = $c('#lyrics.cifra')
    if (!lyricsBox.length) {
      console.warn('Bloco de cifra vazio:', cifradaPath)
      skipped += 1
      continue
    }

    const titleRaw = $c('#lyricContent h1').first().text().trim() || 'Sem título'
    const title = stripCifradaTitle(titleRaw)
    const inner = lyricsBox.html() || ''
    const content = cifradaHtmlToBracketed(inner)
    if (!content || content.length < 8) {
      console.warn('Conteúdo muito curto, ignorando:', title)
      skipped += 1
      continue
    }

    const styles = parseVDataStyles(cifradaHtml)
    const genreSlug = mapVagalumeStylesToGenreSlug(styles)
    const genre = await prisma.genre.findUnique({ where: { slug: genreSlug } })
    if (!genre) {
      console.warn('Gênero não encontrado no banco (slug):', genreSlug, '— rode npx prisma db seed')
      skipped += 1
      continue
    }

    const key = extractKeyFromContent(content)
    const tags = JSON.stringify(styles.length ? styles : [genre.name])

    const baseSlug = `${slugify(title)}-${artist.slug}`
    const songSlug = await uniqueSongSlug(baseSlug)

    try {
      await prisma.song.create({
        data: {
          title,
          slug: songSlug,
          artistId: artist.id,
          genreId: genre.id,
          key,
          content,
          tags,
          isPublic: true,
        },
      })
      imported += 1
      console.log('Importada:', title, '| tom:', key ?? '—', '| gênero:', genre.name)
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : ''
      if (code === 'P2002') {
        console.warn('Já existe (slug duplicado), ignorando:', title)
        skipped += 1
      } else throw e
    }
  }

  console.log('Concluído.', { importadas: imported, ignoradas: skipped })
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect().finally(() => process.exit(1))
})
