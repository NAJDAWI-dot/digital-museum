import React from 'react';
import { Composition } from 'remotion';
import HighlightsReel, { calculateTotalFrames } from './HighlightsReel.jsx';
import { reelData } from './data.js';
import { FPS, WIDTH, HEIGHT } from './theme.js';

export default function RemotionRoot() {
  return (
    <Composition
      id="HighlightsReel"
      component={HighlightsReel}
      durationInFrames={calculateTotalFrames(reelData)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ data: reelData }}
    />
  );
}
