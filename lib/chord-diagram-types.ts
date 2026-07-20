/** Dados de diagrama de acorde (servidor e cliente). */
export interface ChordPopupDiagramData {
  frets: number[]
  fingering: number[]
  barres?: Array<{
    fromString: number
    toString: number
    fret: number
  }>
}
