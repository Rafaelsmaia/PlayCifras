import { NextResponse } from 'next/server'
import { open, stat } from 'node:fs/promises'
import { shortAudioPath } from '@/lib/video-pipeline/short-fs'

type Ctx = { params: { slug: string } }

/**
 * Serve audio.mp3 com suporte a Range — sem isso o browser
 * reinicia do zero ao pausar/seek.
 */
export async function GET(req: Request, { params }: Ctx) {
  const file = shortAudioPath(params.slug)
  let st
  try {
    st = await stat(file)
  } catch {
    return NextResponse.json({ error: 'audio.mp3 não encontrado' }, { status: 404 })
  }

  const size = st.size
  const range = req.headers.get('range')

  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range)
    if (!m) {
      return new NextResponse(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}` },
      })
    }
    const start = m[1] ? parseInt(m[1], 10) : 0
    const end = m[2] ? parseInt(m[2], 10) : Math.min(start + 1024 * 1024 - 1, size - 1)
    if (start >= size || end >= size || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${size}` },
      })
    }
    const chunkSize = end - start + 1
    const fh = await open(file, 'r')
    const buf = Buffer.alloc(chunkSize)
    await fh.read(buf, 0, chunkSize, start)
    await fh.close()

    return new NextResponse(new Uint8Array(buf), {
      status: 206,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(chunkSize),
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
      },
    })
  }

  const fh = await open(file, 'r')
  const buf = Buffer.alloc(size)
  await fh.read(buf, 0, size, 0)
  await fh.close()

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    },
  })
}
