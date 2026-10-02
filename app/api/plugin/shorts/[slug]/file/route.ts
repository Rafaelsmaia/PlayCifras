import { NextResponse } from 'next/server'
import { readPremierePackageFile } from '@/lib/video-pipeline/plugin-premiere'

type Ctx = { params: { slug: string } }

/** GET /api/plugin/shorts/:slug/file?path=cifra.srt */
export async function GET(req: Request, { params }: Ctx) {
  const url = new URL(req.url)
  const rel = url.searchParams.get('path')
  if (!rel) {
    return NextResponse.json(
      { error: 'Query path= é obrigatória' },
      { status: 400 }
    )
  }

  try {
    const file = await readPremierePackageFile(params.slug, rel)
    if (!file) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }
    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
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
