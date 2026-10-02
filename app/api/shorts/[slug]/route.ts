import { NextResponse } from 'next/server'
import { access, cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  remotionPublicShortDir,
  shortAudioPath,
  shortExportDir,
  shortMetaPath,
  shortTimelinePath,
} from '@/lib/video-pipeline/short-fs'
import {
  TIMELINE_VERSION,
  migrateTimelineToV3,
  sealTrack,
  validateTimeline,
  ensureExpandedChordMarks,
  type ShortTimeline,
} from '@/lib/video-pipeline/timeline'

type Ctx = { params: { slug: string } }

async function exists(p: string) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

export async function GET(_req: Request, { params }: Ctx) {
  const slug = params.slug
  const timelineFile = shortTimelinePath(slug)
  if (!(await exists(timelineFile))) {
    return NextResponse.json(
      {
        error:
          'Short não preparado. Rode: npx tsx scripts/video-pipeline/prepare-short.ts ' +
          slug,
      },
      { status: 404 }
    )
  }

  const raw = JSON.parse(
    await readFile(timelineFile, 'utf8')
  ) as ShortTimeline
  const beforeCount = raw.chordMarks?.length ?? 0

  let timeline = raw
  if (timeline.version !== 3 || !timeline.lyricLines?.length) {
    timeline = migrateTimelineToV3(timeline)
  }
  timeline = ensureExpandedChordMarks(timeline)

  if (timeline.chordMarks.length !== beforeCount) {
    await writeFile(timelineFile, JSON.stringify(timeline, null, 2), 'utf8')
  }

  let meta: Record<string, unknown> = {}
  try {
    meta = JSON.parse(await readFile(shortMetaPath(slug), 'utf8'))
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    timeline,
    meta,
    hasAudio: await exists(shortAudioPath(slug)),
  })
}

export async function PUT(req: Request, { params }: Ctx) {
  const slug = params.slug
  const body = (await req.json()) as { timeline?: ShortTimeline }
  if (!body.timeline) {
    return NextResponse.json({ error: 'timeline obrigatório' }, { status: 400 })
  }

  let timeline = body.timeline
  if (timeline.slug && timeline.slug !== slug) {
    return NextResponse.json({ error: 'slug divergente' }, { status: 400 })
  }
  timeline.slug = slug
  timeline.version = TIMELINE_VERSION

  if (!timeline.lyricLines?.length && timeline.events?.length) {
    timeline = migrateTimelineToV3(timeline)
  }

  sealTrack(timeline.lyricLines, timeline.durationSec)
  sealTrack(timeline.chordMarks, timeline.durationSec)
  delete timeline.events

  try {
    validateTimeline(timeline)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'timeline inválida' },
      { status: 400 }
    )
  }

  const outDir = shortExportDir(slug)
  await mkdir(outDir, { recursive: true })
  await writeFile(
    shortTimelinePath(slug),
    JSON.stringify(timeline, null, 2),
    'utf8'
  )

  const remotionDir = remotionPublicShortDir()
  await mkdir(remotionDir, { recursive: true })
  try {
    await cp(outDir, remotionDir, { recursive: true })
  } catch {
    await writeFile(
      path.join(remotionDir, 'timeline.json'),
      JSON.stringify(timeline, null, 2),
      'utf8'
    )
  }

  let meta: Record<string, unknown> = { slug }
  try {
    meta = JSON.parse(await readFile(shortMetaPath(slug), 'utf8'))
  } catch {
    /* ignore */
  }
  meta = {
    ...meta,
    slug,
    audioStartSec: timeline.audioStartSec ?? 0,
    updatedAt: new Date().toISOString(),
    aligned: true,
    alignedBy: 'manual-editor',
  }
  await writeFile(shortMetaPath(slug), JSON.stringify(meta, null, 2), 'utf8')

  return NextResponse.json({ ok: true, timeline })
}
