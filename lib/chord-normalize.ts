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
 * Nota: `M` final (Tonal, ex. CM) NÃO usa flag `i` — senão `Cm` (menor) vira `C`.
 */
/** Aliases BR comuns (cifras) → nome curado na biblioteca. */
const CHORD_ALIASES: Record<string, string> = {
  C4: 'Csus4',
  F2: 'Fadd9',
  Bb2: 'Bbadd9',
  G2: 'Gadd9',
  D2: 'Dadd9',
  A2: 'Aadd9',
  E2: 'Eadd9',
}

export function chordLookupKeys(name: string): string[] {
  const n = name.trim()
  if (!n) return []
  const keys = new Set<string>([n])
  const major = /^([A-G](?:#|b)?)M$/.exec(n)
  if (major) keys.add(major[1])
  const alias = CHORD_ALIASES[n]
  if (alias) keys.add(alias)
  // C9/E → também tenta C9
  const slash = n.indexOf('/')
  if (slash > 0) {
    const base = n.slice(0, slash)
    keys.add(base)
    const baseAlias = CHORD_ALIASES[base]
    if (baseAlias) keys.add(baseAlias)
  }
  return Array.from(keys)
}
