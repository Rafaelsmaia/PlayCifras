import { NextResponse } from 'next/server'
import {
  getCachedOverlay,
  renderShortOverlay,
  shortOverlayPath,
  timelineFingerprint,
} from '@/lib/video-pipeline/render-overlay'
import { access } from 'node:fs/promises'
import path from 'node:path'

export const dynamic = 'force-dynamic'
/** Render Remotion pode demorar (local). */
export const maxDuration = 300

type Ctx = { params: { slug: string } }

/**
 * POST /api/plugin/shorts/:slug/render-overlay
 * Body opcional: { force?: boolean }
 * Renderiza (ou usa cache) overlay.mov ProRes 4444.
 */
export async function POST(req: Request, { params }: Ctx) {
  const slug = params.slug
  let force = false
  try {
    const body = (await req.json()) as { force?: boolean }
    force = Boolean(body.force)
  } catch {
    /* ok */
  }

  try {
    const result = await renderShortOverlay(slug, { force })
    return NextResponse.json({
      ok: true,
      slug,
      cached: result.cached,
      overlayPath: result.overlayPath,
      fingerprint: result.fingerprint,
      relativePath: path.relative(process.cwd(), result.overlayPath),
    })
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'Falha ao renderizar overlay',
      },
      { status: 500 }
    )
  }
}

/**
 * GET — status do cache (sem renderizar).
 */
export async function GET(_req: Request, { params }: Ctx) {
  const slug = params.slug
  try {
    const cached = await getCachedOverlay(slug)
    const overlayPath = shortOverlayPath(slug)
    let exists = false
    try {
      await access(overlayPath)
      exists = true
    } catch {
      exists = false
    }
    let fingerprint: string | null = null
    try {
      fingerprint = await timelineFingerprint(slug)
    } catch {
      fingerprint = null
    }
    return NextResponse.json({
      ok: true,
      slug,
      ready: Boolean(cached),
      exists,
      overlayPath: exists ? overlayPath : null,
      fingerprint,
      cachedFingerprint: cached?.fingerprint ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Falha' },
      { status: 500 }
    )
  }
}
