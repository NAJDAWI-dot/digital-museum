import React from 'react';
import { Composition } from 'remotion';
import HighlightsReel, { calculateTotalFrames } from './HighlightsReel.jsx';
import ProjectTrailer, { TRAILER_FRAMES } from './ProjectTrailer.jsx';
import { FormatProvider } from './format.jsx';
import { reelData } from './data.js';
import { FPS, WIDTH, HEIGHT } from './theme.js';

function HighlightsReelVertical(props) {
  return (
    <FormatProvider format="vertical">
      <HighlightsReel {...props} />
    </FormatProvider>
  );
}

export default function RemotionRoot() {
  return (
    <>
      <Composition
        id="HighlightsReel"
        component={HighlightsReel}
        durationInFrames={calculateTotalFrames(reelData)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ data: reelData }}
      />

      {/* Same reel, 9:16 — for Instagram/TikTok/Shorts. Identical data and
          duration; slides adapt their own layout via the format context. */}
      <Composition
        id="HighlightsReelVertical"
        component={HighlightsReelVertical}
        durationInFrames={calculateTotalFrames(reelData)}
        fps={FPS}
        width={HEIGHT}
        height={WIDTH}
        defaultProps={{ data: reelData }}
      />

      {/* 15-second single-exhibit teaser, dispatched per project from the
          admin app (render-trailer.yml passes projectId via --props). */}
      <Composition
        id="ProjectTrailer"
        component={ProjectTrailer}
        durationInFrames={TRAILER_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ projectId: reelData.projects[0]?.id || '' }}
      />
    </>
  );
}
