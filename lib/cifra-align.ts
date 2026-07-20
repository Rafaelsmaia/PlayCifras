/**
 * Realinha linhas de acordes “apertadas” acima da letra (estilo cifra).
 */

function isTabLine(line: string): boolean {
  const s = line.trim()
  if (!s) return false
  // Qualquer corda de tablatura: E| B| G| D| A| C| (e variações com espaços)
  if (/^[EBGDA]\s*\|/i.test(s)) return true
  if (/^[EBGDA][-|=0-9xX\s./\\]+$/i.test(s) && /-{3,}/.test(s)) return true
  // Linha quase só de hífen/número/pipe (resto de tab)
  const tabChars = (s.match(/[-|=0-9]/g) || []).length
  if (s.includes('|') && tabChars / s.length > 0.7) return true
  return false
}

function isChordOnlyLine(line: string): boolean {
  const withoutChords = line.replace(/\[[^\]]*\]/g, '').replace(/\s/g, '')
  return withoutChords.length === 0 && /\[[^\]]+\]/.test(line)
}

/** Distribui `[acordes]` ao longo da largura da letra. */
export function alignBracketChordsToLyric(chords: string[], lyric: string): string {
  const tokens = chords.map((c) => `[${c}]`)
  if (tokens.length === 0) return ''
  if (tokens.length === 1) return tokens[0]

  const lyricLen = Math.max(lyric.trimEnd().length, 1)
  const positions: number[] = []

  for (let i = 0; i < tokens.length; i++) {
    if (i === 0) {
      positions.push(0)
    } else if (i === tokens.length - 1) {
      positions.push(Math.max(0, lyricLen - tokens[i].length))
    } else {
      positions.push(
        Math.floor((i / (tokens.length - 1)) * Math.max(0, lyricLen - tokens[i].length))
      )
    }
  }

  for (let i = 1; i < positions.length; i++) {
    const minPos = positions[i - 1] + tokens[i - 1].length + 1
    if (positions[i] < minPos) positions[i] = minPos
  }

  let line = ''
  for (let i = 0; i < tokens.length; i++) {
    while (line.length < positions[i]) line += ' '
    line += tokens[i]
  }
  return line
}

/** Realinha linhas só-acorde comprimidas usando a linha de letra seguinte. */
export function realignCrampedChordLines(content: string): string {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const out: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const next = lines[i + 1]

    if (
      next &&
      isChordOnlyLine(line) &&
      !isChordOnlyLine(next) &&
      next.trim() &&
      !isTabLine(next) &&
      !/\[[^\]]+\]\s{3,}\[/.test(line)
    ) {
      const chords = Array.from(line.matchAll(/\[([^\]]+)\]/g)).map((m) =>
        m[1].trim()
      )
      if (chords.length >= 2) {
        out.push(alignBracketChordsToLyric(chords, next.trimEnd()))
        continue
      }
    }

    out.push(line)
  }

  return out.join('\n')
}

export { isTabLine }
