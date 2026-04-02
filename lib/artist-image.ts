/**
 * A Last.fm devolve uma imagem placeholder (estrela em círculo cinza) quando não há arte oficial.
 * O path da URL contém o hash `2a96cbd8` — tratar como "sem foto".
 */
export function isLastFmPlaceholderImageUrl(url: string): boolean {
  return url.toLowerCase().includes('2a96cbd8')
}

/**
 * Normaliza caminhos locais e ignora placeholders da Last.fm (mostra inicial / fallback na UI).
 */
export function normalizeArtistImage(src?: string | null): string | null {
  if (!src?.trim()) return null
  let s = src.trim()
  if (/^https?:\/\/example\.com/i.test(s)) return null

  s = s
    .replace(/^\/IMAGES\/ARTISTAS\//i, '/images/artistas/')
    .replace(/^\/images\/ARTISTAS\//i, '/images/artistas/')
    .replace(/^\/IMAGES\/artistas\//i, '/images/artistas/')

  if (!/^https?:\/\//i.test(s) && !s.startsWith('/')) {
    s = `/${s.replace(/^\/+/, '')}`
  }

  if (isLastFmPlaceholderImageUrl(s)) return null
  return s
}
