import { NextResponse } from 'next/server'
import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { shortChordPath } from '@/lib/video-pipeline/short-fs'

type Ctx = { params: { slug: string } }

export async function GET(req: Request, { params }: Ctx) {
  const url = new URL(req.url)
  const chord = url.searchParams.get('name') || ''
  if (!chord) {
    return NextResponse.json({ error: 'name obrigatório' }, { status: 400 })
  }

  const file = shortChordPath(params.slug, chord)
  try {
    await access(file)
  } catch {
    return NextResponse.json({ error: 'diagrama não encontrado' }, { status: 404 })
  }

  const st = await stat(file)
  const nodeStream = createReadStream(file)
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(st.size),
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
