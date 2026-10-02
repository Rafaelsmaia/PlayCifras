/**
 * Prepara um short a partir de uma cifra do banco.
 *
 * Uso:
 *   npx tsx scripts/video-pipeline/prepare-short.ts <slug> [--duration=45] [--whisper]
 *
 * Gera timeline no layout dos vídeos PlayCifras:
 *   esquerda = acordes sobre a letra | direita = diagrama
 *
 * Sync fino pode ser editado à mão em timeline.json (campos t / tEnd).
 * --whisper usa cache whisper.json se existir (sem nova cobrança).
 */
import 'dotenv/config'
import { cp, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '../../lib/database'
import {
  extractCifraDisplayLines,
  uniqueChordsFromDisplayLines,
} from '../../lib/video-pipeline/extract-cifra-beats'
import {
  TIMELINE_VERSION,
  type ShortTimeline,
  type ShortMeta,
  validateTimeline,
} from '../../lib/video-pipeline/timeline'
import { exportChordPngs } from './export-short-chords'
import { ensureShortAudio } from './download-audio'
import { alignLyricsWithWhisper, hasOpenAIKey, loadWhisperCache } from './align-lyrics'
import {
  tracksFromDisplayLines,
  mergeDisplayLinesWithWhisper,
} from './merge-beats-whisper'

function getArg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : null
}

function getDuration(): number {
  const raw = getArg('duration')
  const n = raw ? parseFloat(raw) : 45
  return Number.isFinite(n) && n >= 8 ? n : 45
}

const USE_WHISPER = process.argv.includes('--whisper')
const WHISPER_FORCE = process.argv.includes('--whisper-force')

async function main() {
  const songSlug = process.argv.slice(2).find((a) => !a.startsWith('-'))
  if (!songSlug) {
    console.error(
      'Uso: prepare-short.ts <slug> [--duration=45] [--whisper] [--whisper-force]'
    )
    process.exit(1)
  }

  let durationSec = getDuration()
  const song = await prisma.song.findUnique({
    where: { slug: songSlug },
    include: { artist: { select: { name: true } } },
  })
  if (!song) {
    console.error('Cifra não encontrada:', songSlug)
    process.exit(1)
  }

  const allLines = extractCifraDisplayLines(song.content)
  if (!allLines.length) {
    console.error('Não foi possível extrair linhas de cifra.')
    process.exit(1)
  }

  // ~1 linha a cada ~3s no short (editável depois)
  const maxLines = Math.min(allLines.length, Math.max(4, Math.floor(durationSec / 3)))
  const lines = allLines.slice(0, maxLines)

  const outDir = path.join(process.cwd(), 'exports', 'shorts', song.slug)
  const chordsDir = path.join(outDir, 'chords')
  await mkdir(chordsDir, { recursive: true })

  console.log(`→ ${song.artist.name} — ${song.title}`)
  console.log(`  linhas de cifra: ${allLines.length} (usando ${lines.length})`)

  const audioPath = await ensureShortAudio({
    outDir,
    youtubeVideoId: song.youtubeVideoId,
  })
  const hasAudio = Boolean(audioPath)

  let tracks = tracksFromDisplayLines(lines, durationSec)
  let aligned = false
  let audioStartSec = 0

  if (USE_WHISPER && audioPath) {
    const cached = !WHISPER_FORCE ? await loadWhisperCache(audioPath) : null
    if (cached || hasOpenAIKey()) {
      const whisper =
        cached ??
        (await alignLyricsWithWhisper(audioPath, { forceRefresh: WHISPER_FORCE }))
      if (whisper?.segments.length) {
        if (whisper.durationSec > 0 && whisper.durationSec < durationSec) {
          durationSec = Math.ceil(whisper.durationSec)
        }
        const merged = mergeDisplayLinesWithWhisper(
          lines,
          whisper.segments,
          durationSec
        )
        tracks = {
          lyricLines: merged.lyricLines,
          chordMarks: merged.chordMarks,
        }
        audioStartSec = merged.audioStartSec
        aligned = true
        if (audioStartSec > 0) {
          console.log(`  áudio: corte de intro @ ${audioStartSec.toFixed(2)}s`)
        }
      }
    } else {
      console.warn('  --whisper ignorado: sem cache e sem OPENAI_API_KEY')
    }
  }

  // Preserva corte de intro já conhecido no meta antigo (sem Whisper)
  if (!aligned && audioStartSec === 0) {
    try {
      const { readFile } = await import('node:fs/promises')
      const prev = JSON.parse(
        await readFile(path.join(outDir, 'meta.json'), 'utf8')
      ) as { audioStartSec?: number }
      if (prev.audioStartSec && prev.audioStartSec > 0) {
        audioStartSec = prev.audioStartSec
        console.log(`  áudio: mantendo corte @ ${audioStartSec}s (meta anterior)`)
      }
    } catch {
      /* ignore */
    }
  }

  console.log(
    `  duration: ${durationSec}s | letra: ${tracks.lyricLines.length} | diagramas: ${tracks.chordMarks.length} | timings: ${aligned ? 'whisper' : 'zerados (marque no editor)'} | audio: ${hasAudio}`
  )

  const chordNames = uniqueChordsFromDisplayLines(lines)
  console.log(`  exportando ${chordNames.length} diagramas…`)
  const chordsExported = await exportChordPngs(chordNames, chordsDir)

  const timeline: ShortTimeline = {
    version: TIMELINE_VERSION,
    slug: song.slug,
    title: song.title,
    artist: song.artist.name,
    audio: hasAudio ? 'audio.mp3' : null,
    audioStartSec,
    youtubeVideoId: song.youtubeVideoId,
    durationSec,
    width: 1080,
    height: 1920,
    fps: 30,
    lyricLines: tracks.lyricLines,
    chordMarks: tracks.chordMarks,
    diagrams: chordsExported,
  }
  validateTimeline(timeline)

  await writeFile(
    path.join(outDir, 'timeline.json'),
    JSON.stringify(timeline, null, 2),
    'utf8'
  )

  const meta: ShortMeta & {
    hasAudio: boolean
    aligned: boolean
    audioStartSec: number
  } = {
    slug: song.slug,
    outDir,
    chordsExported,
    createdAt: new Date().toISOString(),
    hasAudio,
    aligned,
    audioStartSec,
  }
  await writeFile(
    path.join(outDir, 'meta.json'),
    JSON.stringify(meta, null, 2),
    'utf8'
  )

  const remotionPublic = path.join(
    process.cwd(),
    'video-shorts',
    'public',
    'short'
  )
  await mkdir(path.join(remotionPublic, 'chords'), { recursive: true })
  await writeFile(
    path.join(remotionPublic, 'timeline.json'),
    JSON.stringify(timeline, null, 2),
    'utf8'
  )
  await writeFile(
    path.join(remotionPublic, 'meta.json'),
    JSON.stringify(meta, null, 2),
    'utf8'
  )
  await cp(chordsDir, path.join(remotionPublic, 'chords'), { recursive: true })
  if (hasAudio && audioPath) {
    await cp(audioPath, path.join(remotionPublic, 'audio.mp3'))
  }

  console.log(`\n✓ Short preparado em ${path.relative(process.cwd(), outDir)}`)
  console.log('  Layout: letra (lyricLines) + diagramas (chordMarks) independentes')
  console.log('  Sync: http://localhost:3000/short-editor/' + song.slug)
  console.log('  Próximo: npm run short:studio  |  npm run short:render')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
