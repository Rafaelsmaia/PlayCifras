/**
 * Alinha letra via OpenAI Whisper (verbose_json + timestamps).
 * Requer OPENAI_API_KEY.
 *
 * Cache: grava whisper.json ao lado do áudio. Reusa sem nova cobrança
 * a menos que forceRefresh=true.
 */
import { readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'

export type WhisperSegment = {
  t: number
  tEnd: number
  text: string
}

type WhisperVerbose = {
  duration?: number
  segments?: Array<{
    start: number
    end: number
    text: string
  }>
}

export type WhisperAlignResult = {
  segments: WhisperSegment[]
  durationSec: number
  fromCache: boolean
}

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

async function exists(p: string) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

function cachePathForAudio(audioPath: string) {
  return path.join(path.dirname(audioPath), 'whisper.json')
}

export async function loadWhisperCache(
  audioPath: string
): Promise<WhisperAlignResult | null> {
  const cachePath = cachePathForAudio(audioPath)
  if (!(await exists(cachePath))) return null
  try {
    const raw = JSON.parse(await readFile(cachePath, 'utf8')) as {
      durationSec?: number
      segments?: WhisperSegment[]
    }
    if (!raw.segments?.length) return null
    console.log(
      `  whisper: cache (${raw.segments.length} segmentos) — sem nova cobrança`
    )
    return {
      segments: raw.segments,
      durationSec: raw.durationSec ?? 0,
      fromCache: true,
    }
  } catch {
    return null
  }
}

export async function saveWhisperCache(
  audioPath: string,
  result: { segments: WhisperSegment[]; durationSec: number }
) {
  const cachePath = cachePathForAudio(audioPath)
  await writeFile(
    cachePath,
    JSON.stringify(
      {
        durationSec: result.durationSec,
        segments: result.segments,
        savedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    'utf8'
  )
}

export async function alignLyricsWithWhisper(
  audioPath: string,
  opts?: { forceRefresh?: boolean }
): Promise<WhisperAlignResult | null> {
  if (!opts?.forceRefresh) {
    const cached = await loadWhisperCache(audioPath)
    if (cached) return cached
  }

  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    console.warn('  whisper: OPENAI_API_KEY ausente — timings uniformes')
    return null
  }

  const buf = await readFile(audioPath)
  const form = new FormData()
  const bytes = new Uint8Array(buf)
  const file = new File([bytes], path.basename(audioPath), {
    type: 'audio/mpeg',
  })
  form.append('file', file)
  form.append('model', 'whisper-1')
  form.append('response_format', 'verbose_json')
  form.append('language', 'pt')
  form.append('timestamp_granularities[]', 'segment')

  console.log('  whisper: chamando API (nova cobrança)…')
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  })

  if (!res.ok) {
    const body = await res.text()
    console.warn('  whisper: API erro', res.status, body.slice(0, 300))
    return null
  }

  const data = (await res.json()) as WhisperVerbose
  const segments: WhisperSegment[] = (data.segments ?? []).map((s) => ({
    t: s.start,
    tEnd: s.end,
    text: (s.text || '').trim(),
  }))

  const durationSec =
    data.duration ??
    (segments.length ? segments[segments.length - 1].tEnd : 0)

  console.log(
    `  whisper: ${segments.length} segmentos, ~${durationSec.toFixed(1)}s`
  )

  const result = { segments, durationSec, fromCache: false }
  await saveWhisperCache(audioPath, result)
  console.log('  whisper: cache salvo em whisper.json')
  return result
}
