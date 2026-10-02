import { NextResponse } from 'next/server'
import { getPluginShortDetail } from '@/lib/video-pipeline/plugin-premiere'

type Ctx = { params: { slug: string } }

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const short = await getPluginShortDetail(params.slug)
    if (!short) {
      return NextResponse.json(
        { error: 'Short não encontrado. Rode short:prepare e sincronize.' },
        { status: 404 }
      )
    }
    return NextResponse.json({ ok: true, short })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Falha' },
      { status: 500 }
    )
  }
}
