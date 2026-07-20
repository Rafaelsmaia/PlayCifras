/**
 * Vincula youtubeVideoId às músicas mais acessadas (top N).
 *
 * Fontes:
 *  1) Cifra Club (página da cifra — mesmo clipe que eles embutem)
 *  2) YouTube search (HTML) — fallback
 *
 * Uso:
 *   npx tsx scripts/link-top-song-videos.ts
 *   npx tsx scripts/link-top-song-videos.ts --limit=24
 *   npx tsx scripts/link-top-song-videos.ts --force
 */
import 'dotenv/config'
import axios from 'axios'
import { prisma } from '../lib/database'

const CC_BASE = 'https://www.cifraclub.com.br'
const DELAY_MS = Math.max(300, parseInt(process.env.REQUEST_DELAY_MS || '600', 10) || 600)

function getLimit(): number {
  const arg = process.argv.find((a) => a.startsWith('--limit='))
  if (arg) return Math.max(1, parseInt(arg.split('=')[1] || '24', 10) || 24)
  return 24
}

const FORCE = process.argv.includes('--force')

const http = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    Accept: 'text/html,application/xhtml+xml',
  },
  validateStatus: (s) => s >= 200 && s < 500,
})

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function extractYoutubeIds(html: string): string[] {
  const ids = new Set<string>()
  const patterns = [
    /youtube\.com\/(?:embed|watch\?v=|shorts\/)([\w-]{11})/gi,
    /youtu\.be\/([\w-]{11})/gi,
    /"videoId"\s*:\s*"([\w-]{11})"/gi,
    /i\.ytimg\.com\/vi\/([\w-]{11})\//gi,
  ]
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      const id = m[1]
      // ignora IDs inválidos / placeholders comuns
      if (id && id !== 'undefined' && !/^_+$/.test(id)) ids.add(id)
    }
  }
  return [...ids]
}

/** ID oficial embutido pelo Cifra Club (campo youtubeId no bootstrap da página). */
function extractCifraClubYoutubeId(html: string): string | null {
  const m =
    html.match(/youtubeId\s*:\s*['"]([\w-]{11})['"]/) ||
    html.match(/"youtubeId"\s*:\s*"([\w-]{11})"/)
  return m?.[1] ?? null
}

function songSlugOnCifraClub(fullSlug: string, artistSlug: string): string | null {
  const suffix = `-${artistSlug}`
  if (!fullSlug.endsWith(suffix)) return null
  const songSlug = fullSlug.slice(0, -suffix.length)
  return songSlug || null
}

async function fetchFromCifraClub(
  artistSlug: string,
  songSlug: string
): Promise<string | null> {
  const url = `${CC_BASE}/${artistSlug}/${songSlug}/`
  const res = await http.get<string>(url)
  if (res.status !== 200 || typeof res.data !== 'string') return null
  return extractCifraClubYoutubeId(res.data)
}

async function fetchFromYouTubeSearch(
  title: string,
  artistName: string
): Promise<string | null> {
  const q = `${title} ${artistName} oficial`
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
  const res = await http.get<string>(url)
  if (res.status !== 200 || typeof res.data !== 'string') return null

  // ytInitialData costuma trazer o primeiro videoRenderer
  const dataMatch = res.data.match(/ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s)
  if (dataMatch?.[1]) {
    try {
      const data = JSON.parse(dataMatch[1]) as unknown
      const found = findFirstVideoId(data)
      if (found) return found
    } catch {
      /* parse falhou — regex abaixo */
    }
  }

  const ids = extractYoutubeIds(res.data)
  return ids[0] ?? null
}

function findFirstVideoId(node: unknown, depth = 0): string | null {
  if (depth > 40 || node == null) return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findFirstVideoId(item, depth + 1)
      if (found) return found
    }
    return null
  }
  if (typeof node !== 'object') return null
  const obj = node as Record<string, unknown>
  const renderer = obj.videoRenderer as Record<string, unknown> | undefined
  if (renderer && typeof renderer.videoId === 'string' && renderer.videoId.length === 11) {
    return renderer.videoId
  }
  for (const v of Object.values(obj)) {
    const found = findFirstVideoId(v, depth + 1)
    if (found) return found
  }
  return null
}

async function main() {
  const limit = getLimit()
  const targets = await prisma.song.findMany({
    where: { isPublic: true },
    orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      youtubeVideoId: true,
      artist: { select: { name: true, slug: true } },
    },
  })

  console.log(`Vinculando clipes para ${targets.length} músicas (force=${FORCE})`)

  let fromCc = 0
  let fromYt = 0
  let skipped = 0
  let failed = 0

  for (const song of targets) {
    if (!FORCE && song.youtubeVideoId) {
      skipped += 1
      continue
    }

    await sleep(DELAY_MS)

    let videoId: string | null = null
    let source: 'cifraclub' | 'youtube' | null = null

    const ccSongSlug = songSlugOnCifraClub(song.slug, song.artist.slug)
    if (ccSongSlug) {
      try {
        videoId = await fetchFromCifraClub(song.artist.slug, ccSongSlug)
        if (videoId) source = 'cifraclub'
      } catch (e) {
        console.warn('CC falhou', song.slug, e instanceof Error ? e.message : e)
      }
    }

    if (!videoId) {
      try {
        videoId = await fetchFromYouTubeSearch(song.title, song.artist.name)
        if (videoId) source = 'youtube'
      } catch (e) {
        console.warn('YT falhou', song.slug, e instanceof Error ? e.message : e)
      }
    }

    if (!videoId) {
      console.warn('Sem clipe:', song.artist.name, '-', song.title)
      failed += 1
      continue
    }

    await prisma.song.update({
      where: { id: song.id },
      data: { youtubeVideoId: videoId },
    })

    if (source === 'cifraclub') fromCc += 1
    if (source === 'youtube') fromYt += 1
    console.log(source, `${song.artist.name} — ${song.title}`, '->', videoId)
  }

  console.log('Concluído.', { fromCc, fromYt, skipped, failed })
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
