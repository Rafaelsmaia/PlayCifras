import React from 'react'
import { Composition } from 'remotion'
import {
  DIAGRAM_OVERLAY_DEMO,
  DIAGRAM_OVERLAY_HEIGHT,
  DIAGRAM_OVERLAY_WIDTH,
  DiagramOverlayComposition,
} from './DiagramOverlay'
import type { DiagramOverlayProps } from './diagram-overlay-types'

export const DiagramOverlayEntry: React.FC = () => (
  <Composition
    id="DiagramOverlay"
    component={DiagramOverlayComposition}
    durationInFrames={Math.round(DIAGRAM_OVERLAY_DEMO.durationSec * DIAGRAM_OVERLAY_DEMO.fps)}
    fps={DIAGRAM_OVERLAY_DEMO.fps}
    width={DIAGRAM_OVERLAY_WIDTH}
    height={DIAGRAM_OVERLAY_HEIGHT}
    defaultProps={DIAGRAM_OVERLAY_DEMO}
    calculateMetadata={({ props }: { props: DiagramOverlayProps }) => ({
      fps: props.fps,
      durationInFrames: Math.max(1, Math.round(props.durationSec * props.fps)),
    })}
  />
)
