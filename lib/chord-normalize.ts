/**
 * Normaliza nomes de acordes entre notação Tonal (ex.: CM, BbM) e cifras comuns (C, Bb).
 */

/** Converte símbolo Tonal de tríade maior (CM, GM, BbM) para o nome usado em cifras (C, G, Bb). */
export function tonalMajorSymbolToLyricName(symbol: string): string {
  const s = symbol.replace(/\s/g, '')
  const m = /^([A-G](?:#|b)?)M$/i.exec(s)
  if (m) return m[1]
  return s
}

/**
 * Chaves alternativas para busca no dicionário (mesmo acorde, grafias diferentes).
 */
export function chordLookupKeys(name: string): string[] {
  const n = name.trim()
  if (!n) return []
  const keys = new Set<string>([n])
  const major = /^([A-G](?:#|b)?)M$/i.exec(n)
  if (major) keys.add(major[1])
  return Array.from(keys)
}
