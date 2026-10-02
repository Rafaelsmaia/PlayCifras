import { readFile, access } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import {
  getCachedOverlay,
  shortOverlayPath,
} from '@/lib/video-pipeline/render-overlay'
import path from 'node:path'

type Ctx = { params: { slug: string } }

/**
 * GET /api/plugin/shorts/:slug/overlay
 *   ?meta=1 → JSON com path local
 *   default → stream do .mov (se existir)
 */
export async function GET(req: Request, { params }: Ctx) {
  const slug = params.slug
  const url = new URL(req.url)
  const meta = url.searchParams.get('meta') === '1'

  try {
    const overlayPath = shortOverlayPath(slug)
    try {
      await access(overlayPath)
    } catch {
      return NextResponse.json(
        {
          error:
            'Overlay ainda não renderizado. POST /render-overlay primeiro.',
        },
        { status: 404 }
      )
    }

    if (meta) {
      const cached = await getCachedOverlay(slug)
      return NextResponse.json({
        ok: true,
        slug,
        overlayPath,
        relativePath: path.relative(process.cwd(), overlayPath),
        ready: Boolean(cached),
      })
    }

    const buf = await readFile(overlayPath)
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'video/quicktime',
        'Content-Disposition': `inline; filename="${slug}-overlay.mov"`,
        'Content-Length': String(buf.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Falha' },
      { status: 500 }
    )
  }
}
