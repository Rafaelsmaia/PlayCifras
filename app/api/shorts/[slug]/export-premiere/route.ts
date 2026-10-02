import { NextResponse } from 'next/server'
import path from 'node:path'
import { exportPremierePackage } from '@/lib/video-pipeline/export-premiere-package'

type Ctx = { params: { slug: string } }

export async function POST(req: Request, { params }: Ctx) {
  const slug = params.slug
  let withIntroOffset = false
  try {
    const body = (await req.json()) as { withIntroOffset?: boolean }
    withIntroOffset = Boolean(body.withIntroOffset)
  } catch {
    /* body opcional */
  }

  try {
    const result = await exportPremierePackage(slug, { withIntroOffset })
    return NextResponse.json({
      ok: true,
      outDir: path.relative(process.cwd(), result.outDir),
      files: result.files,
      pngCount: result.pngCount,
      relative: result.relative,
      offset: result.offset,
      warning: result.warning,
    })
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'Falha no export Premiere',
      },
      { status: 500 }
    )
  }
}
