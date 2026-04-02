/** Domínios com otimização Next/Image configurada em `next.config.js`. */
export function needsUnoptimizedRemoteImage(src: string): boolean {
  if (!/^https?:\/\//i.test(src)) return false
  try {
    const h = new URL(src).hostname
    return h !== 'i.scdn.co' && h !== 'lastfm.freetls.fastly.net'
  } catch {
    return true
  }
}
