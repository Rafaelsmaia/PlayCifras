/**
 * Normalização para busca: remove diacríticos e padroniza minúsculas.
 * Ex.: "Legião" e "Legiao" → mesma chave de comparação.
 */
export function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function normalizeSearchNeedle(value: string): string {
  return stripDiacritics(value.trim()).toLowerCase()
}
