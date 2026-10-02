import { NextResponse } from 'next/server'
import { listPluginShorts } from '@/lib/video-pipeline/plugin-premiere'

export async function GET() {
  try {
    const shorts = await listPluginShorts()
    return NextResponse.json({
      ok: true,
      count: shorts.length,
      shorts,
    })
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'Falha ao listar shorts',
      },
      { status: 500 }
    )
  }
}
