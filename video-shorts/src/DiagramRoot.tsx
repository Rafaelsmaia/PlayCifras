import React from 'react'
import { Composition } from 'remotion'
import { DIAGRAM_OVERLAY_DEMO, DiagramOverlayComposition } from './DiagramOverlay'
import { LYRICS_OVERLAY_DEMO, LyricsOverlayComposition } from './LyricsOverlay'
import { RHYTHM_OVERLAY_DEMO, RhythmOverlayComposition } from './RhythmOverlay'
import type {
  DiagramOverlayProps,
  LyricsOverlayProps,
  RhythmOverlayProps,
} from './diagram-overlay-types'
import { frameOf } from './overlay-layout'

/** ProRes exige dimensões pares. */
const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)

function metadataOf(props: { durationSec: number; fps: number; width?: number; height?: number }) {
  const { width, height } = frameOf(props)
  return {
    fps: props.fps,
    durationInFrames: Math.max(1, Math.round(props.durationSec * props.fps)),
    width: even(width),
    height: even(height),
  }
}

export const DiagramOverlayEntry: React.FC = () => (
  <>
    <Composition
      id="DiagramOverlay"
      component={DiagramOverlayComposition}
      durationInFrames={Math.round(DIAGRAM_OVERLAY_DEMO.durationSec * DIAGRAM_OVERLAY_DEMO.fps)}
      fps={DIAGRAM_OVERLAY_DEMO.fps}
      width={1080}
      height={1920}
      defaultProps={DIAGRAM_OVERLAY_DEMO}
      calculateMetadata={({ props }: { props: DiagramOverlayProps }) => metadataOf(props)}
    />
    <Composition
      id="LyricsOverlay"
      component={LyricsOverlayComposition}
      durationInFrames={Math.round(LYRICS_OVERLAY_DEMO.durationSec * LYRICS_OVERLAY_DEMO.fps)}
      fps={LYRICS_OVERLAY_DEMO.fps}
      width={1080}
      height={1920}
      defaultProps={LYRICS_OVERLAY_DEMO}
      calculateMetadata={({ props }: { props: LyricsOverlayProps }) => metadataOf(props)}
    />
    <Composition
      id="RhythmOverlay"
      component={RhythmOverlayComposition}
      durationInFrames={1}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={RHYTHM_OVERLAY_DEMO}
      calculateMetadata={({ props }: { props: RhythmOverlayProps }) =>
        metadataOf({ ...props, durationSec: 1 / 30, fps: 30 })
      }
    />
  </>
)
