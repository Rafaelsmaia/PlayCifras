import { NextResponse } from 'next/server'
import { diagramShapesForChords } from '@/lib/video-pipeline/diagram-shapes'

/**
 * POST /api/plugin/chord-shapes — body { chords: string[] }
 * Digitações prontas para a composição DiagramOverlay (usado pelo ajudante de render).
 */
export async function POST(req: Request) {
  let chords: unknown
  try {
    chords = ((await req.json()) as { chords?: unknown }).chords
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (!Array.isArray(chords) || !chords.length || chords.length > 200) {
    return NextResponse.json({ error: 'Envie chords: string[] (1–200)' }, { status: 400 })
  }
  return NextResponse.json({ ok: true, ...diagramShapesForChords(chords.map(String)) })
}
