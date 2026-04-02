import 'dotenv/config'

/**
 * Preenche Artist.image com URLs de fotos.
 *
 * Ordem (recomendado):
 *  1) Spotify Web API (search) — costuma ter fotos reais para artistas ocidentais/pop.
 *  2) Last.fm — fallback; ignora placeholder genérico (estrela).
 *
 * Credenciais (pelo menos uma fonte):
 *   - SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET — https://developer.spotify.com/dashboard
 *   - LASTFM_API_KEY — https://www.last.fm/api/account/create
 *
 * Opcional: REQUEST_DELAY_MS, DEFAULT_ARTIST_IMAGE, MAX_ARTISTS
 *
 * Uso: npx tsx scripts/fetch-artist-images.ts
 */
import axios from 'axios'
import { prisma } from '../lib/database'
import { isLastFmPlaceholderImageUrl } from '../lib/artist-image'

const LASTFM = 'https://ws.audioscrobbler.com/2.0/'

const DELAY_MS = Math.max(
  200,
  parseInt(process.env.REQUEST_DELAY_MS || '400', 10) || 400
)

function getMaxArtists(): number {
  const v = process.env.MAX_ARTISTS
  if (v === undefined || v === '') return 0
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

const MAX_ARTISTS = getMaxArtists()
const DEFAULT_FALLBACK = process.env.DEFAULT_ARTIST_IMAGE?.trim() || null

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/* ---------- Spotify ---------- */

let spotifyToken: string | null = null
let spotifyTokenExp = 0

async function ensureSpotifyAccessToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID?.trim()
  const secret = process.env.SPOTIFY_CLIENT_SECRET?.trim()
  if (!id || !secret) return null

  const now = Date.now()
  if (spotifyToken && spotifyTokenExp > now + 30_000) return spotifyToken

  const auth = Buffer.from(`${id}:${secret}`).toString('base64')
  const { data } = await axios.post<{
    access_token: string
    expires_in: number
  }>(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000,
    }
  )

  spotifyToken = data.access_token
  spotifyTokenExp = now + (data.expires_in - 120) * 1000
  return spotifyToken
}

type SpotifySearch = {
  artists?: {
    items?: Array<{
      images: Array<{ url: string }>
    }>
  }
}

async function fetchSpotifyArtistImage(
  token: string,
  artistName: string
): Promise<string | null> {
  const { data } = await axios.get<SpotifySearch>(
    'https://api.spotify.com/v1/search',
    {
      params: {
        q: artistName,
        type: 'artist',
        limit: 5,
      },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    }
  )

  const items = data?.artists?.items ?? []
  for (const a of items) {
    const imgs = a.images
    if (imgs?.length && imgs[0]?.url?.trim()) {
      return imgs[0].url.trim()
    }
  }
  return null
}

/* ---------- Last.fm ---------- */

type LfmImage = { '#text': string; size: string }

type LfmGetInfo = {
  error?: number
  message?: string
  artist?: {
    name: string
    image?: LfmImage[]
  }
}

function pickBestImageUrl(images: LfmImage[] | undefined): string | null {
  if (!images?.length) return null
  const priority = ['mega', 'extralarge', 'large', 'medium', 'small', '']
  for (const size of priority) {
    const found = images.find((i) => i.size === size && i['#text']?.trim())
    if (found?.['#text']?.trim()) return found['#text'].trim()
  }
  const any = images.map((i) => i['#text']?.trim()).filter(Boolean)
  return any.length ? any[any.length - 1]! : null
}

async function fetchLastFmArtistImage(
  apiKey: string,
  artistName: string
): Promise<string | null> {
  const { data } = await axios.get<LfmGetInfo>(LASTFM, {
    params: {
      method: 'artist.getinfo',
      artist: artistName,
      api_key: apiKey,
      format: 'json',
      autocorrect: 1,
    },
    timeout: 15000,
    validateStatus: () => true,
  })

  if (typeof data === 'object' && data && 'error' in data && data.error) {
    return null
  }

  const url = pickBestImageUrl(data?.artist?.image)
  if (!url || url.length < 8) return null
  if (isLastFmPlaceholderImageUrl(url)) return null
  return url
}

/* ---------- main ---------- */

async function main() {
  const useSpotify = !!(
    process.env.SPOTIFY_CLIENT_ID?.trim() &&
    process.env.SPOTIFY_CLIENT_SECRET?.trim()
  )
  const lastfmKey = process.env.LASTFM_API_KEY?.trim()

  if (!useSpotify && !lastfmKey) {
    console.error(
      'Defina no .env pelo menos uma opção:\n' +
        '  SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET (https://developer.spotify.com/dashboard)\n' +
        '  e/ou LASTFM_API_KEY (https://www.last.fm/api/account/create)'
    )
    process.exit(1)
  }

  if (useSpotify) {
    try {
      await ensureSpotifyAccessToken()
      console.log('Spotify: token OK (client credentials)')
    } catch (e) {
      console.error(
        'Aviso: não foi possível obter token do Spotify agora (rede ou credenciais).',
        lastfmKey ? 'Usando Last.fm até funcionar.' : e
      )
      if (!lastfmKey) {
        console.error('Sem Last.fm como fallback — corrija SPOTIFY_* ou defina LASTFM_API_KEY.')
        process.exit(1)
      }
    }
  }

  const withoutImage = await prisma.artist.findMany({
    where: {
      OR: [{ image: null }, { image: '' }],
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
    ...(MAX_ARTISTS > 0 ? { take: MAX_ARTISTS } : {}),
  })

  console.log(
    'Artistas sem foto:',
    withoutImage.length,
    MAX_ARTISTS > 0 ? `(limite MAX_ARTISTS=${MAX_ARTISTS})` : ''
  )
  console.log(
    'Fontes:',
    [useSpotify && 'Spotify (primeiro)', lastfmKey && 'Last.fm (fallback)']
      .filter(Boolean)
      .join(' → ')
  )
  console.log('Delay entre artistas:', DELAY_MS, 'ms')

  let updated = 0
  let skipped = 0
  let fallbackLocal = 0
  let fromSpotify = 0
  let fromLastfm = 0

  for (const a of withoutImage) {
    try {
      await sleep(DELAY_MS)

      let remote: string | null = null
      let source: 'spotify' | 'lastfm' | null = null

      if (useSpotify) {
        try {
          const t = await ensureSpotifyAccessToken()
          if (t) {
            remote = await fetchSpotifyArtistImage(t, a.name)
            if (remote) source = 'spotify'
          }
        } catch {
          /* rede ou credenciais; Last.fm abaixo se houver */
        }
      }

      if (!remote && lastfmKey) {
        remote = await fetchLastFmArtistImage(lastfmKey, a.name)
        if (remote) source = 'lastfm'
      }

      const finalUrl = remote ?? DEFAULT_FALLBACK

      if (!finalUrl) {
        console.warn('Sem imagem:', a.name)
        skipped += 1
        continue
      }

      if (!remote && DEFAULT_FALLBACK) {
        fallbackLocal += 1
      }
      if (source === 'spotify') fromSpotify += 1
      if (source === 'lastfm') fromLastfm += 1

      await prisma.artist.update({
        where: { id: a.id },
        data: { image: finalUrl },
      })
      updated += 1
      console.log(
        remote ? source ?? 'local' : 'fallback',
        a.name,
        '->',
        finalUrl.slice(0, 72) + (finalUrl.length > 72 ? '…' : '')
      )
    } catch (e) {
      console.warn('Erro', a.name, e)
      skipped += 1
    }
  }

  console.log('Concluído.', {
    atualizados: updated,
    ignorados: skipped,
    fallbackLocal,
    urlsSpotify: fromSpotify,
    urlsLastfm: fromLastfm,
  })
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect().finally(() => process.exit(1))
})
