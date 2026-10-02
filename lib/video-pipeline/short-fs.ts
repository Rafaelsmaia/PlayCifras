import path from 'node:path'

export function shortExportDir(slug: string) {
  return path.join(process.cwd(), 'exports', 'shorts', slug)
}

export function shortTimelinePath(slug: string) {
  return path.join(shortExportDir(slug), 'timeline.json')
}

export function shortMetaPath(slug: string) {
  return path.join(shortExportDir(slug), 'meta.json')
}

export function shortAudioPath(slug: string) {
  return path.join(shortExportDir(slug), 'audio.mp3')
}

export function shortChordPath(slug: string, chord: string) {
  const safe = chord.replace(/[^a-zA-Z0-9#b]/g, '_') || 'chord'
  return path.join(shortExportDir(slug), 'chords', `${safe}.png`)
}

export function remotionPublicShortDir() {
  return path.join(process.cwd(), 'video-shorts', 'public', 'short')
}

export function chordFileSafeName(chord: string) {
  return chord.replace(/[^a-zA-Z0-9#b]/g, '_') || 'chord'
}
