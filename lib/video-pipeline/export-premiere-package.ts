/**
 * Pacote Premiere ← PlayCifras (sem áudio).
 * Usado pelo CLI e pela API do editor.
 */
import { access, cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  migrateTimelineToV3,
  type ShortChordMark,
  type ShortLyricLine,
  type ShortTimeline,
} from '@/lib/video-pipeline/timeline'
import {
  shortChordPath,
  shortExportDir,
  shortTimelinePath,
} from '@/lib/video-pipeline/short-fs'

const BOM = '\uFEFF'

function pad(n: number, w = 2) {
  return String(n).padStart(w, '0')
}

function srtTimestamp(sec: number): string {
  const s = Math.max(0, sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const whole = Math.floor(s % 60)
  const ms = Math.round((s - Math.floor(s)) * 1000)
  return `${pad(h)}:${pad(m)}:${pad(whole)},${pad(ms, 3)}`
}

function premiereTimecode(sec: number, fps: number): string {
  const s = Math.max(0, sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const whole = Math.floor(s % 60)
  const frames = Math.min(fps - 1, Math.round((s - Math.floor(s)) * fps))
  return `${pad(h)}:${pad(m)}:${pad(whole)}:${pad(frames)}`
}

type Cue = { start: number; end: number; text: string }

function cueEnd(
  t: number,
  tEnd: number | undefined,
  nextT: number | undefined,
  durationSec: number,
  fallback: number
): number {
  if (nextT != null && nextT > t) return nextT
  if (tEnd != null && tEnd > t) return tEnd
  return Math.min(durationSec, t + fallback)
}

function toSrt(cues: Cue[]): string {
  const lines: string[] = []
  let n = 1
  for (const c of cues) {
    const text = String(c.text ?? '').trim()
    if (!text) continue
    const start = c.start
    const end = c.end > start ? c.end : start + 0.4
    lines.push(String(n))
    lines.push(`${srtTimestamp(start)} --> ${srtTimestamp(end)}`)
    lines.push(text)
    lines.push('')
    n += 1
  }
  return lines.join('\n')
}

function lyricCues(
  lines: ShortLyricLine[],
  offset: number,
  durationSec: number
): Cue[] {
  return lines.map((line, i) => ({
    start: offset + line.t,
    end:
      offset +
      cueEnd(line.t, line.tEnd, lines[i + 1]?.t, durationSec, 3),
    text: line.lyric ?? '',
  }))
}

function chordCues(
  marks: ShortChordMark[],
  offset: number,
  durationSec: number
): Cue[] {
  return marks.map((m, i) => ({
    start: offset + m.t,
    end:
      offset + cueEnd(m.t, m.tEnd, marks[i + 1]?.t, durationSec, 1.5),
    text: m.chord ?? '',
  }))
}

function cifraCues(
  lines: ShortLyricLine[],
  offset: number,
  durationSec: number
): Cue[] {
  return lines.map((line, i) => {
    const chords =
      (line.chordLine ?? '').trim() ||
      (line.chords ?? []).filter(Boolean).join('  ')
    const lyric = line.lyric ?? ''
    return {
      start: offset + line.t,
      end:
        offset +
        cueEnd(line.t, line.tEnd, lines[i + 1]?.t, durationSec, 3),
      text: chords ? `${chords}\n${lyric}` : lyric,
    }
  })
}

function markersCsv(
  timeline: ShortTimeline,
  offset: number,
  fps: number
): string {
  const rows: string[] = ['Name,Description,In,Out,Duration,Type']
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`

  for (let i = 0; i < timeline.lyricLines.length; i++) {
    const line = timeline.lyricLines[i]
    const start = offset + line.t
    const end =
      offset +
      cueEnd(
        line.t,
        line.tEnd,
        timeline.lyricLines[i + 1]?.t,
        timeline.durationSec,
        3
      )
    const dur = Math.max(0.01, end - start)
    rows.push(
      [
        esc(`Letra ${i + 1}`),
        esc(line.lyric),
        premiereTimecode(start, fps),
        premiereTimecode(end, fps),
        premiereTimecode(dur, fps),
        'Comment',
      ].join(',')
    )
  }

  for (let i = 0; i < timeline.chordMarks.length; i++) {
    const m = timeline.chordMarks[i]
    const start = offset + m.t
    const end =
      offset +
      cueEnd(
        m.t,
        m.tEnd,
        timeline.chordMarks[i + 1]?.t,
        timeline.durationSec,
        1.5
      )
    const dur = Math.max(0.01, end - start)
    rows.push(
      [
        esc(`Acorde ${i + 1}`),
        esc(m.chord),
        premiereTimecode(start, fps),
        premiereTimecode(end, fps),
        premiereTimecode(dur, fps),
        'Comment',
      ].join(',')
    )
  }

  return rows.join('\n') + '\n'
}

export type PremiereExportResult = {
  outDir: string
  files: string[]
  offset: number
  relative: boolean
  pngCount: number
  warning?: string
}

export async function exportPremierePackage(
  slug: string,
  opts?: { withIntroOffset?: boolean }
): Promise<PremiereExportResult> {
  const timelinePath = shortTimelinePath(slug)
  let timeline = JSON.parse(
    await readFile(timelinePath, 'utf8')
  ) as ShortTimeline
  if (timeline.version !== 3 || !timeline.lyricLines?.length) {
    timeline = migrateTimelineToV3(timeline)
  }

  const relative = !opts?.withIntroOffset
  const offset = relative ? 0 : timeline.audioStartSec ?? 0
  const fps = timeline.fps || 30
  const outDir = path.join(shortExportDir(slug), 'premiere')
  await mkdir(outDir, { recursive: true })
  await mkdir(path.join(outDir, 'diagrams'), { recursive: true })

  const lyricsMarked = timeline.lyricLines.filter((l) => l.t > 0).length
  const chordsMarked = timeline.chordMarks.filter((c) => c.t > 0).length
  let warning: string | undefined
  if (lyricsMarked === 0 && chordsMarked === 0) {
    warning =
      'Todos os tempos estão em 0 — sincronize no editor (L/D) antes de usar no Premiere.'
  }

  const files: string[] = []
  const write = async (name: string, body: string) => {
    await writeFile(path.join(outDir, name), body, 'utf8')
    files.push(name)
  }

  await write(
    'lyrics.srt',
    BOM + toSrt(lyricCues(timeline.lyricLines, offset, timeline.durationSec))
  )
  await write(
    'chords.srt',
    BOM + toSrt(chordCues(timeline.chordMarks, offset, timeline.durationSec))
  )
  await write(
    'cifra.srt',
    BOM + toSrt(cifraCues(timeline.lyricLines, offset, timeline.durationSec))
  )
  await write('markers.csv', BOM + markersCsv(timeline, offset, fps))

  const uniqueChords = Array.from(
    new Set(timeline.chordMarks.map((m) => m.chord).filter(Boolean))
  )
  const diagramList: string[] = []
  let pngCount = 0
  for (const chord of uniqueChords) {
    const src = shortChordPath(slug, chord)
    try {
      await access(src)
      const safe = chord.replace(/[^a-zA-Z0-9#b]/g, '_') || 'chord'
      const destName = `${safe}.png`
      await cp(src, path.join(outDir, 'diagrams', destName))
      diagramList.push(`${chord}\tdiagrams/${destName}`)
      files.push(`diagrams/${destName}`)
      pngCount += 1
    } catch {
      diagramList.push(`${chord}\t(sem PNG)`)
    }
  }
  await write('diagrams.txt', diagramList.join('\n') + '\n')

  await write(
    'timeline.ref.json',
    JSON.stringify(
      {
        slug: timeline.slug,
        title: timeline.title,
        artist: timeline.artist,
        durationSec: timeline.durationSec,
        fps,
        audioStartSec: timeline.audioStartSec ?? 0,
        exportMode: relative ? 'relative-to-short' : 'with-intro-offset',
        offsetApplied: offset,
        note: 'Pacote sem áudio — use o áudio do Premiere',
        lyricLines: timeline.lyricLines,
        chordMarks: timeline.chordMarks,
      },
      null,
      2
    )
  )

  await write(
    'LEIA-ME.txt',
    [
      'PlayCifras → Adobe Premiere Pro',
      '================================',
      '',
      'Este pacote NÃO inclui áudio.',
      'Use o áudio/vídeo que você já tem no Premiere.',
      '',
      relative
        ? 'Tempos RELATIVOS ao short (0:00 = início do trecho sincronizado no editor).'
        : `Tempos com offset de intro (${offset}s) sobre a música completa.`,
      '',
      warning ? `ATENÇÃO: ${warning}` : 'Sync aparenta ter marcações.',
      '',
      'Arquivos',
      '--------',
      '  cifra.srt     — acordes + letra (recomendado)',
      '  lyrics.srt    — só letra',
      '  chords.srt    — só nome do acorde',
      '  markers.csv   — marcadores In/Out',
      '  diagrams/     — PNGs dos diagramas',
      '  diagrams.txt  — índice acorde → arquivo',
      '  timeline.ref.json',
      '',
      'Fluxo no Premiere',
      '-----------------',
      '  1. Seu áudio/vídeo já na timeline',
      '  2. Alinhe o playhead ao início do trecho (mesmo do editor)',
      '  3. Arquivo > Importar > cifra.srt',
      '     (ou Legendas > Importar arquivos de legendas)',
      '  4. Arraste a track de legendas para a timeline',
      '  5. (Opcional) Importe diagrams/*.png conforme os acordes',
      '',
      'Estilo (fonte, cor, posição) = Premiere.',
      'PlayCifras entrega só texto + tempo + PNGs.',
      '',
      `Gerado · ${new Date().toISOString()}`,
      '',
    ].join('\n')
  )

  return { outDir, files, offset, relative, pngCount, warning }
}
