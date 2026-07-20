export type ChordTitleFontId =
  | 'nunito'
  | 'montserrat'
  | 'inter'
  | 'poppins'
  | 'fredoka'
  | 'mono'

export type ChordTitleFont = {
  id: ChordTitleFontId
  label: string
  family: string
}

/** Fontes disponíveis no título do montador de acordes. */
export const CHORD_TITLE_FONTS: readonly ChordTitleFont[] = [
  {
    id: 'nunito',
    label: 'Nunito',
    family: 'var(--font-nunito), Nunito, system-ui, sans-serif'
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    family: 'var(--font-montserrat), Montserrat, system-ui, sans-serif'
  },
  {
    id: 'inter',
    label: 'Inter',
    family: 'var(--font-inter), Inter, system-ui, sans-serif'
  },
  {
    id: 'poppins',
    label: 'Poppins',
    family: 'var(--font-poppins), Poppins, system-ui, sans-serif'
  },
  {
    id: 'fredoka',
    label: 'Fredoka',
    family: 'var(--font-fredoka), Fredoka, system-ui, sans-serif'
  },
  {
    id: 'mono',
    label: 'Mono',
    family: 'var(--font-roboto-mono), "Roboto Mono", monospace'
  }
] as const

export const DEFAULT_CHORD_TITLE_FONT: ChordTitleFontId = 'nunito'

export function getChordTitleFontFamily(id: ChordTitleFontId): string {
  return (
    CHORD_TITLE_FONTS.find((f) => f.id === id)?.family ??
    CHORD_TITLE_FONTS[0].family
  )
}
