/**
 * Render / cache do overlay ProRes 4444 (alpha) para Premiere.
 */
import { access, cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { shortExportDir, shortTimelinePath } from '@/lib/video-pipeline/short-fs'

export type OverlayRenderResult = {
  overlayPath: string
  cached: boolean
  fingerprint: string
}

function overlayPathFor(slug: string) {
  return path.join(shortExportDir(slug), 'overlay.mov')
}

function fingerprintPathFor(slug: string) {
  return path.join(shortExportDir(slug), 'overlay.fingerprint')
}

async function exists(p: string) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

export async function timelineFingerprint(slug: string): Promise<string> {
  const raw = await readFile(shortTimelinePath(slug), 'utf8')
  return createHash('sha1').update(raw).digest('hex')
}

export async function getCachedOverlay(
  slug: string
): Promise<OverlayRenderResult | null> {
  const overlayPath = overlayPathFor(slug)
  const fpPath = fingerprintPathFor(slug)
  if (!(await exists(overlayPath)) || !(await exists(fpPath))) return null
  const fingerprint = (await readFile(fpPath, 'utf8')).trim()
  const current = await timelineFingerprint(slug)
  if (fingerprint !== current) return null
  return { overlayPath, cached: true, fingerprint }
}

export async function renderShortOverlay(
  slug: string,
  opts?: { force?: boolean; onLog?: (msg: string) => void }
): Promise<OverlayRenderResult> {
  const log = opts?.onLog ?? (() => {})
  const timelinePath = shortTimelinePath(slug)
  if (!(await exists(timelinePath))) {
    throw new Error(
      `Short não preparado. Rode: npm run short:prepare -- ${slug}`
    )
  }

  const fingerprint = await timelineFingerprint(slug)
  if (!opts?.force) {
    const cached = await getCachedOverlay(slug)
    if (cached) {
      log('Overlay em cache (timeline sem mudanças).')
      return cached
    }
  }

  const src = shortExportDir(slug)
  const dest = path.join(process.cwd(), 'video-shorts', 'public', 'short')
  await mkdir(dest, { recursive: true })
  log('Copiando assets → video-shorts/public/short …')
  await cp(src, dest, { recursive: true })

  const overlayPath = overlayPathFor(slug)
  await mkdir(path.dirname(overlayPath), { recursive: true })

  log('Render Remotion ShortOverlay (ProRes 4444 + alpha)…')
  const code: number = await new Promise((resolve) => {
    const child = spawn(
      'npx',
      [
        'remotion',
        'render',
        'src/index.ts',
        'ShortOverlay',
        overlayPath,
        '--codec=prores',
        '--prores-profile=4444',
        '--image-format=png',
        '--pixel-format=yuva444p10le',
        '--muted',
        '--overwrite',
      ],
      {
        cwd: path.join(process.cwd(), 'video-shorts'),
        stdio: 'inherit',
        shell: true,
      }
    )
    child.on('close', (c) => resolve(c ?? 1))
  })

  if (code !== 0) {
    throw new Error(`Remotion falhou (exit ${code})`)
  }

  const st = await stat(overlayPath)
  if (!st.size) throw new Error('overlay.mov vazio')

  await writeFile(fingerprintPathFor(slug), fingerprint, 'utf8')
  return { overlayPath, cached: false, fingerprint }
}

export function shortOverlayPath(slug: string) {
  return overlayPathFor(slug)
}
