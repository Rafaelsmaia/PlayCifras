import 'server-only'

import type { ChordPopupDiagramData } from '@/lib/chord-diagram-types'
import { chordDiagramsForChordNames } from '@/lib/chord-dictionary-batch'
import { extractUniqueChords } from '@/lib/chord-markup'
import { prisma } from '@/lib/database'

export type SongWithChordDictionary = {
  id: string
  title: string
  slug: string
  key: string | null
  tempo: number | null
  difficulty: string | null
  content: string
  youtubeVideoId: string | null
  views: number
  likes: number
  chordsInContent: string[]
  chordDictionary: Record<string, ChordPopupDiagramData>
  artist: {
    name: string
    slug: string
    image: string | null
  }
}

export type GetSongBySlugResult =
  | { status: 'ok'; song: SongWithChordDictionary }
  | { status: 'not_found' }
  | { status: 'error' }

const songBySlugSelect = {
  id: true,
  title: true,
  slug: true,
  key: true,
  tempo: true,
  difficulty: true,
  content: true,
  youtubeVideoId: true,
  views: true,
  likes: true,
  artist: {
    select: {
      name: true,
      slug: true,
      image: true
    }
  }
} as const

const PERF = process.env.NODE_ENV === 'development'

function perfTime(label: string) {
  if (PERF) console.time(label)
}

function perfTimeEnd(label: string) {
  if (PERF) console.timeEnd(label)
}

/** Busca cifra e dicionário de acordes (sem cache — use na API). */
export async function getSongBySlug(rawSlug: string): Promise<GetSongBySlugResult> {
  const slug = decodeURIComponent(rawSlug)
  const perfPrefix = `[getSongBySlug:${slug}]`

  try {
    perfTime(`${perfPrefix} total`)
    perfTime(`${perfPrefix} prisma:song`)
    let song
    try {
      song = await prisma.song.findUnique({
        where: { slug },
        select: songBySlugSelect
      })
    } finally {
      perfTimeEnd(`${perfPrefix} prisma:song`)
    }

    if (!song) {
      perfTimeEnd(`${perfPrefix} total`)
      return { status: 'not_found' }
    }

    perfTime(`${perfPrefix} extract-chords`)
    const chordsInContent = extractUniqueChords(song.content)
    perfTimeEnd(`${perfPrefix} extract-chords`)

    let chordDictionary: Record<string, ChordPopupDiagramData> = {}
    try {
      perfTime(`${perfPrefix} chord-dictionary`)
      chordDictionary = await chordDiagramsForChordNames(chordsInContent, 'guitar')
      perfTimeEnd(`${perfPrefix} chord-dictionary`)
    } catch (dictErr) {
      perfTimeEnd(`${perfPrefix} chord-dictionary`)
      console.error('[getSongBySlug] chord dictionary skipped:', dictErr)
    }

    perfTimeEnd(`${perfPrefix} total`)

    return {
      status: 'ok',
      song: {
        id: song.id,
        title: song.title,
        slug: song.slug,
        key: song.key,
        tempo: song.tempo,
        difficulty: song.difficulty,
        content: song.content,
        youtubeVideoId: song.youtubeVideoId,
        views: song.views,
        likes: song.likes,
        chordsInContent,
        chordDictionary,
        artist: song.artist
      }
    }
  } catch (error) {
    perfTimeEnd(`${perfPrefix} total`)
    console.error('[getSongBySlug] error:', error)
    return { status: 'error' }
  }
}
