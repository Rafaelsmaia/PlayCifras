import { NextRequest, NextResponse } from 'next/server'
import { chordDiagramsForChordNames } from '@/lib/chord-dictionary-batch'

export const dynamic = 'force-dynamic'

/** POST { names: string[], instrument?: string } — devolve diagramas indexados pelo nome pedido (cifra). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      names?: string[]
      instrument?: string
    }
    const names = Array.isArray(body.names)
      ? Array.from(
          new Set(body.names.map((n) => String(n).trim()).filter(Boolean))
        )
      : []
    const instrument = (body.instrument || 'guitar').trim() || 'guitar'

    if (names.length === 0) {
      return NextResponse.json({ chords: {} as Record<string, unknown> })
    }

    const chords = await chordDiagramsForChordNames(names, instrument)

    return NextResponse.json({ chords })
  } catch (error) {
    console.error('chord dictionary batch:', error)
    return NextResponse.json(
      { error: 'Failed to load chord dictionary' },
      { status: 500 }
    )
  }
}
