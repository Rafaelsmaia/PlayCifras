import React from 'react'
import { Composition } from 'remotion'
import { ShortComposition, type ShortProps } from './Short'
import { DiagramOverlayEntry } from './DiagramRoot'
import type { ShortTimeline } from './timeline-types'

const FALLBACK: ShortProps = {
  title: 'PlayCifras Short',
  artist: 'Rode npm run short:prepare — <slug>',
  slug: 'demo',
  lyricLines: [
    {
      t: 0,
      tEnd: 5,
      chordLine: 'Am',
      lyric: 'Prepare o short primeiro',
      chords: ['Am'],
    },
  ],
  chordMarks: [{ t: 0, tEnd: 5, chord: 'Am' }],
  diagrams: [],
  hasAudio: false,
  durationSec: 10,
  overlay: false,
}

function normalize(data: ShortTimeline): ShortProps {
  let lyricLines = data.lyricLines ?? []
  let chordMarks = data.chordMarks ?? []

  if ((!lyricLines.length || data.version < 3) && data.events?.length) {
    lyricLines = []
    chordMarks = []
    for (const ev of data.events) {
      const chordLine =
        ev.chordLine || (ev.chord ? String(ev.chord) : '')
      const chords =
        ev.chords?.length
          ? [...ev.chords]
          : ev.chord
            ? [ev.chord]
            : []
      const last = lyricLines[lyricLines.length - 1]
      if (!last || last.lyric !== ev.lyric || last.chordLine !== chordLine) {
        lyricLines.push({
          t: ev.t,
          tEnd: ev.tEnd,
          chordLine,
          lyric: ev.lyric,
          chords,
        })
      }
      const chord = ev.chord || chords[0]
      if (chord) chordMarks.push({ t: ev.t, tEnd: ev.tEnd, chord })
    }
  }

  return {
    title: data.title,
    artist: data.artist,
    slug: data.slug,
    lyricLines,
    chordMarks,
    diagrams: data.diagrams ?? [],
    hasAudio: data.audio === 'audio.mp3',
    durationSec: data.durationSec || 45,
    audioStartSec: data.audioStartSec ?? 0,
  }
}

function loadTimeline(): { props: ShortProps; durationSec: number; fps: number } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require('../public/short/timeline.json') as ShortTimeline
    let hasAudio = data.audio === 'audio.mp3'
    let diagramsFromMeta: string[] = []
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const meta = require('../public/short/meta.json') as {
        hasAudio?: boolean
        chordsExported?: string[]
      }
      if (typeof meta.hasAudio === 'boolean') hasAudio = meta.hasAudio
      if (meta.chordsExported?.length) diagramsFromMeta = meta.chordsExported
    } catch {
      /* ignore */
    }

    if (!data?.lyricLines?.length && !data?.events?.length) {
      return { props: FALLBACK, durationSec: 10, fps: 30 }
    }
    const props = normalize(data)
    props.hasAudio = hasAudio
    if (!props.diagrams?.length && diagramsFromMeta.length) {
      props.diagrams = diagramsFromMeta
    }
    if (!props.diagrams?.length && props.chordMarks?.length) {
      props.diagrams = [
        ...new Set(props.chordMarks.map((m) => m.chord).filter(Boolean)),
      ]
    }
    return {
      props,
      durationSec: props.durationSec ?? 45,
      fps: data.fps || 30,
    }
  } catch {
    return { props: FALLBACK, durationSec: 10, fps: 30 }
  }
}

const loaded = loadTimeline()

export const RemotionRoot: React.FC = () => {
  const { props, durationSec, fps } = loaded
  const frames = Math.max(fps * 5, Math.round(durationSec * fps))

  return (
    <>
      <Composition
        id="Short"
        component={ShortComposition}
        durationInFrames={frames}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{ ...props, overlay: false }}
      />
      <Composition
        id="ShortOverlay"
        component={ShortComposition}
        durationInFrames={frames}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{
          ...props,
          overlay: true,
          hasAudio: false,
        }}
      />
      <DiagramOverlayEntry />
    </>
  )
}
