/**
 * Expressão SQLite que aplica lower() e remove acentos comuns (PT/EN)
 * para comparar com o needle já normalizado em JS (stripDiacritics + lower).
 * O nome da coluna/expressão vem só de strings fixas no código (não de input do usuário).
 */
const ACCENT_REPLACEMENTS: [string, string][] = [
  ['á', 'a'],
  ['à', 'a'],
  ['â', 'a'],
  ['ä', 'a'],
  ['ã', 'a'],
  ['å', 'a'],
  ['æ', 'ae'],
  ['é', 'e'],
  ['è', 'e'],
  ['ê', 'e'],
  ['ë', 'e'],
  ['í', 'i'],
  ['ì', 'i'],
  ['î', 'i'],
  ['ï', 'i'],
  ['ó', 'o'],
  ['ò', 'o'],
  ['ô', 'o'],
  ['ö', 'o'],
  ['õ', 'o'],
  ['ø', 'o'],
  ['ú', 'u'],
  ['ù', 'u'],
  ['û', 'u'],
  ['ü', 'u'],
  ['ç', 'c'],
  ['ñ', 'n'],
  ['ý', 'y'],
  ['ÿ', 'y'],
  ['ß', 'ss']
]

export function buildSqliteNoAccentLowerSQL(columnExpr: string): string {
  let expr = `lower(${columnExpr})`
  for (const [from, to] of ACCENT_REPLACEMENTS) {
    const safeFrom = from.replace(/'/g, "''")
    const safeTo = to.replace(/'/g, "''")
    expr = `replace(${expr}, '${safeFrom}', '${safeTo}')`
  }
  return expr
}
