/** Constantes de tablatura usadas pelo overlay Remotion. */

export const TAB_STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'] as const
export const TAB_STRING_COUNT = TAB_STRING_LABELS.length

export type TabColumn = (number | null)[]

export const TAB_NOTE_PENDING = '#ffffff'
export const TAB_NOTE_PLAYED = '#f33aff'
export const TAB_BADGE_FILL = '#f33aff'
export const TAB_LINE = 'rgba(255,255,255,0.85)'

export function lerpTabNoteColor(progress: number): string {
  const p = Math.min(1, Math.max(0, progress))
  const a = hexToRgb(TAB_NOTE_PENDING)
  const b = hexToRgb(TAB_NOTE_PLAYED)
  return `rgb(${Math.round(a.r + (b.r - a.r) * p)},${Math.round(
    a.g + (b.g - a.g) * p
  )},${Math.round(a.b + (b.b - a.b) * p)})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}
