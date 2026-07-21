import React from 'react';
import { Composition } from 'remotion';
import HighlightsReel, { calculateTotalFrames } from './HighlightsReel.jsx';
import ProjectTrailer, { TRAILER_FRAMES } from './ProjectTrailer.jsx';
import { FormatProvider } from './format.jsx';
import { reelData } from './data.js';
import { FPS, WIDTH, HEIGHT } from './theme.js';
import Preview3DParticles, { PREVIEW_3D_PARTICLES_FRAMES } from './previews/Preview3DParticles.jsx';
import Preview3DGalleryCSS, { PREVIEW_3D_GALLERY_CSS_FRAMES } from './previews/Preview3DGalleryCSS.jsx';
import Preview3DEmblem, { PREVIEW_3D_EMBLEM_FRAMES } from './previews/Preview3DEmblem.jsx';
import Preview3DGalleryWebGL, { PREVIEW_3D_GALLERY_WEBGL_FRAMES } from './previews/Preview3DGalleryWebGL.jsx';

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

      {/* --- 3D idea previews, sandboxed: never imported by HighlightsReel.jsx,
          purely for evaluating a look in Studio (and a headless smoke render)
          before anything gets wired into the real reel. --- */}
      <Composition
        id="Preview3DParticles"
        component={Preview3DParticles}
        durationInFrames={PREVIEW_3D_PARTICLES_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Preview3DGalleryCSS"
        component={Preview3DGalleryCSS}
        durationInFrames={PREVIEW_3D_GALLERY_CSS_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Preview3DEmblem"
        component={Preview3DEmblem}
        durationInFrames={PREVIEW_3D_EMBLEM_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Preview3DGalleryWebGL"
        component={Preview3DGalleryWebGL}
        durationInFrames={PREVIEW_3D_GALLERY_WEBGL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
}
