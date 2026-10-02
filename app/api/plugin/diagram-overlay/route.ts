import { NextResponse } from 'next/server'
import {
  renderDiagramOverlay,
  type DiagramOverlayInput,
} from '@/lib/video-pipeline/render-diagram-overlay'

export const dynamic = 'force-dynamic'
/** Render Remotion pode demorar (local). */
export const maxDuration = 300

/**
 * POST /api/plugin/diagram-overlay
 * Body: { marks: [{ t, chord }], endSec, fps?, slug?, force? } — tempos absolutos da sequência.
 * Retorna o .mov (ProRes 4444 alpha) e `startSec` para posicionar na timeline.
 */
export async function POST(req: Request) {
  let body: DiagramOverlayInput
  try {
    body = (await req.json()) as DiagramOverlayInput
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (!Array.isArray(body?.marks) || !body.marks.length) {
    return NextResponse.json({ error: 'Envie marks: [{ t, chord }]' }, { status: 400 })
  }

  try {
    const result = await renderDiagramOverlay(body)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Falha ao renderizar diagramas' },
      { status: 500 }
    )
  }
}
