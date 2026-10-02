/**
 * Baixa áudio de um YouTube ID com yt-dlp → audio.mp3
 *
 * Preferência de invocação:
 *   1) yt-dlp no PATH
 *   2) python -m yt_dlp  /  py -m yt_dlp
 *
 * Usa o ffmpeg do Remotion quando disponível (--ffmpeg-location).
 * Docs: https://github.com/yt-dlp/yt-dlp
 */
import { access, rename, readdir } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

export async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

function remotionFfmpeg(): string | null {
  const candidates = [
    path.join(
      process.cwd(),
      'video-shorts',
      'node_modules',
      '@remotion',
      'compositor-win32-x64-msvc',
      'ffmpeg.exe'
    ),
    path.join(
      process.cwd(),
      'video-shorts',
      'node_modules',
      '@remotion',
      'compositor-darwin-x64',
      'ffmpeg'
    ),
    path.join(
      process.cwd(),
      'video-shorts',
      'node_modules',
      '@remotion',
      'compositor-darwin-arm64',
      'ffmpeg'
    ),
    path.join(
      process.cwd(),
      'video-shorts',
      'node_modules',
      '@remotion',
      'compositor-linux-x64-gnu',
      'ffmpeg'
    ),
  ]
  return candidates.find((c) => existsSync(c)) ?? null
}

type Runner = { cmd: string; prefix: string[] }

function ytDlpRunners(): Runner[] {
  return [
    { cmd: 'yt-dlp', prefix: [] },
    { cmd: 'python', prefix: ['-m', 'yt_dlp'] },
    { cmd: 'py', prefix: ['-m', 'yt_dlp'] },
  ]
}

function run(cmd: string, args: string[]): Promise<{ code: number; err: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let err = ''
    child.stderr?.on('data', (d) => {
      err += String(d)
    })
    child.stdout?.on('data', (d) => {
      err += String(d)
    })
    child.on('error', (e) => resolve({ code: 1, err: String(e.message || e) }))
    child.on('close', (code) => resolve({ code: code ?? 1, err }))
  })
}

async function promoteDownloadedAudio(
  outDir: string,
  destMp3: string
): Promise<boolean> {
  if (await fileExists(destMp3)) return true
  const files = await readdir(outDir)
  const audio = files.find((f) =>
    /^audio\.(mp3|m4a|webm|opus|ogg|wav)$/i.test(f)
  )
  if (!audio) return false
  const src = path.join(outDir, audio)
  if (audio.toLowerCase() === 'audio.mp3') return true
  // Remotion aceita m4a/webm; renomeamos só se for mp3, senão copiamos como audio.mp3 via ffmpeg se possível
  const ffmpeg = remotionFfmpeg()
  if (ffmpeg) {
    const conv = await run(ffmpeg, ['-y', '-i', src, '-vn', '-b:a', '192k', destMp3])
    if (conv.code === 0 && (await fileExists(destMp3))) return true
  }
  // Fallback: usa o arquivo baixado com o nome que o Remotion espera (extensão real)
  // Mantém audio.mp3 só se conversão ok; caso contrário deixa webm e aponta
  try {
    await rename(src, destMp3)
    return await fileExists(destMp3)
  } catch {
    return false
  }
}

export async function downloadYoutubeAudio(
  videoId: string,
  outMp3: string
): Promise<boolean> {
  const url = `https://www.youtube.com/watch?v=${videoId}`
  const outDir = path.dirname(outMp3)
  const outTemplate = path.join(outDir, 'audio.%(ext)s')
  const ffmpeg = remotionFfmpeg()

  const baseArgs = [
    '-f',
    'bestaudio/best',
    '-x',
    '--audio-format',
    'mp3',
    '--audio-quality',
    '192K',
    '-o',
    outTemplate,
    '--no-playlist',
    '--no-warnings',
  ]
  if (ffmpeg) {
    baseArgs.push('--ffmpeg-location', path.dirname(ffmpeg))
  }
  baseArgs.push(url)

  let lastErr = ''
  for (const runner of ytDlpRunners()) {
    const args = [...runner.prefix, ...baseArgs]
    const result = await run(runner.cmd, args)
    lastErr = result.err
    if (await promoteDownloadedAudio(outDir, outMp3)) return true
  }

  // Sem pós-processamento: baixa o stream bruto e converte/renomeia
  const rawArgs = [
    '-f',
    'bestaudio/best',
    '-o',
    outTemplate,
    '--no-playlist',
    '--no-warnings',
    url,
  ]
  for (const runner of ytDlpRunners()) {
    const result = await run(runner.cmd, [...runner.prefix, ...rawArgs])
    lastErr = result.err
    if (await promoteDownloadedAudio(outDir, outMp3)) return true
  }

  console.warn('yt-dlp falhou:', lastErr.slice(-500) || 'sem saída')
  return false
}

export async function ensureShortAudio(opts: {
  outDir: string
  youtubeVideoId?: string | null
}): Promise<string | null> {
  const dest = path.join(opts.outDir, 'audio.mp3')
  if (await fileExists(dest)) {
    console.log('  áudio: usando audio.mp3 existente')
    return dest
  }
  // webm residual de tentativa anterior
  if (await promoteDownloadedAudio(opts.outDir, dest)) {
    console.log('  áudio: convertido/promovido → audio.mp3')
    return dest
  }
  if (!opts.youtubeVideoId) {
    console.warn(
      '  áudio: sem youtubeVideoId e sem audio.mp3 — short sem trilha'
    )
    return null
  }
  console.log(`  áudio: baixando YouTube ${opts.youtubeVideoId}…`)
  const ok = await downloadYoutubeAudio(opts.youtubeVideoId, dest)
  if (!ok) {
    console.warn(
      '  áudio: falha no yt-dlp. Instale yt-dlp (+ ffmpeg) ou coloque audio.mp3 em',
      opts.outDir
    )
    return null
  }
  console.log('  áudio: OK → audio.mp3')
  return dest
}
