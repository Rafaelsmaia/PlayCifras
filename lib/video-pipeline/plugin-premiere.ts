/**
 * Listagem e empacotamento para o painel Premiere (UXP).
 */
import { readdir, readFile, access, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import {
  migrateTimelineToV3,
  type ShortTimeline,
} from '@/lib/video-pipeline/timeline'
import {
  shortExportDir,
  shortTimelinePath,
} from '@/lib/video-pipeline/short-fs'
import { exportPremierePackage } from '@/lib/video-pipeline/export-premiere-package'

export type PluginShortSummary = {
  slug: string
  title: string
  artist: string
  durationSec: number
  synced: boolean
  lyricCount: number
  chordCount: number
  diagramCount: number
  warning?: string
}

function shortsRoot() {
  return path.join(process.cwd(), 'exports', 'shorts')
}

function isSynced(timeline: ShortTimeline): boolean {
  const lyricsMarked = (timeline.lyricLines ?? []).filter((l) => l.t > 0).length
  const chordsMarked = (timeline.chordMarks ?? []).filter((c) => c.t > 0).length
  return lyricsMarked > 0 || chordsMarked > 0
}

async function readTimeline(slug: string): Promise<ShortTimeline | null> {
  try {
    const raw = JSON.parse(
      await readFile(shortTimelinePath(slug), 'utf8')
    ) as ShortTimeline
    if (raw.version !== 3 || !raw.lyricLines?.length) {
      return migrateTimelineToV3(raw)
    }
    return raw
  } catch {
    return null
  }
}

export async function listPluginShorts(): Promise<PluginShortSummary[]> {
  let dirs: string[] = []
  try {
    dirs = await readdir(shortsRoot())
  } catch {
    return []
  }

  const out: PluginShortSummary[] = []
  for (const slug of dirs) {
    const timeline = await readTimeline(slug)
    if (!timeline) continue

    const uniqueChords = Array.from(
      new Set(
        (timeline.chordMarks ?? []).map((m) => m.chord).filter(Boolean)
      )
    )
    let diagramCount = 0
    for (const chord of uniqueChords) {
      const safe = chord.replace(/[^a-zA-Z0-9#b]/g, '_') || 'chord'
      try {
        await access(path.join(shortExportDir(slug), 'chords', `${safe}.png`))
        diagramCount += 1
      } catch {
        /* skip */
      }
    }

    const synced = isSynced(timeline)
    out.push({
      slug: timeline.slug || slug,
      title: timeline.title || slug,
      artist: timeline.artist || '',
      durationSec: timeline.durationSec,
      synced,
      lyricCount: timeline.lyricLines?.length ?? 0,
      chordCount: timeline.chordMarks?.length ?? 0,
      diagramCount,
      warning: synced
        ? undefined
        : 'Tempos ainda em 0 — sincronize no editor (L/D).',
    })
  }

  out.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
  return out
}

export async function getPluginShortDetail(
  slug: string
): Promise<PluginShortSummary | null> {
  const all = await listPluginShorts()
  return all.find((s) => s.slug === slug) ?? null
}

/** Garante pasta premiere/ e cria ZIP; retorna path do zip. */
export async function buildPremiereZip(
  slug: string,
  opts?: { withIntroOffset?: boolean }
): Promise<{
  zipPath: string
  outDir: string
  warning?: string
  pngCount: number
  files: string[]
}> {
  const result = await exportPremierePackage(slug, opts)
  const zipDir = result.outDir
  await mkdir(zipDir, { recursive: true })
  const zipPath = path.join(zipDir, `${slug}-premiere.zip`)

  const zip = new JSZip()
  const textFiles = [
    'cifra.srt',
    'lyrics.srt',
    'chords.srt',
    'markers.csv',
    'diagrams.txt',
    'LEIA-ME.txt',
    'timeline.ref.json',
  ]
  for (const name of textFiles) {
    try {
      zip.file(name, await readFile(path.join(result.outDir, name)))
    } catch {
      /* arquivo opcional */
    }
  }

  for (const rel of result.files) {
    const normalized = rel.replace(/\\/g, '/')
    if (!normalized.startsWith('diagrams/')) continue
    try {
      zip.file(
        normalized,
        await readFile(path.join(result.outDir, normalized))
      )
    } catch {
      /* skip */
    }
  }

  const buf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })
  await writeFile(zipPath, buf)

  return {
    zipPath,
    outDir: result.outDir,
    warning: result.warning,
    pngCount: result.pngCount,
    files: result.files,
  }
}

/** Gera o pacote e lista arquivos (para download arquivo a arquivo no UXP). */
export async function listPremierePackageFiles(slug: string): Promise<{
  outDir: string
  warning?: string
  pngCount: number
  localPaths: string[]
  files: { relativePath: string }[]
}> {
  const result = await exportPremierePackage(slug)
  const relative = new Set<string>()
  for (const rel of result.files) {
    relative.add(rel.replace(/\\/g, '/'))
  }
  for (const extra of ['LEIA-ME.txt', 'timeline.ref.json', 'diagrams.txt']) {
    relative.add(extra)
  }

  const files = Array.from(relative).map((relativePath) => ({ relativePath }))
  const localPaths = files.map((f) => path.join(result.outDir, f.relativePath))

  return {
    outDir: result.outDir,
    warning: result.warning,
    pngCount: result.pngCount,
    localPaths,
    files,
  }
}

export async function readPremierePackageFile(
  slug: string,
  relativePath: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const safe = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!safe || safe.includes('..') || path.isAbsolute(safe)) return null

  const outDir = path.join(shortExportDir(slug), 'premiere')
  const abs = path.join(outDir, safe)
  const resolved = path.resolve(abs)
  const root = path.resolve(outDir)
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return null
  }

  const contentTypeFor = (filePath: string) => {
    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.png') return 'image/png'
    if (ext === '.json') return 'application/json'
    if (ext === '.csv') return 'text/csv; charset=utf-8'
    return 'text/plain; charset=utf-8'
  }

  try {
    const buffer = await readFile(resolved)
    return { buffer, contentType: contentTypeFor(safe) }
  } catch {
    try {
      await exportPremierePackage(slug)
      const buffer = await readFile(resolved)
      return { buffer, contentType: contentTypeFor(safe) }
    } catch {
      return null
    }
  }
}
