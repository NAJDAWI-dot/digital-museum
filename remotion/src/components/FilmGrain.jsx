import React from 'react';
import { AbsoluteFill, useCurrentFrame, random } from 'remotion';

/** A persistent, subtle film-grain + vignette layer mounted once at the
 * root of the composition — the difference between a slideshow and a
 * graded piece is often just this one global texture pass, rather than
 * anything per-slide. Grain seed changes every 2 frames (not every frame)
 * to mimic real film's ~15fps flicker rather than a smooth crawl, and is
 * driven by Remotion's own `random()` (deterministic per string seed) so
 * every render of the same frame produces the same grain — required for
 * Remotion's frame-independent rendering model, unlike `Math.random()`. */
export default function FilmGrain({ opacity = 0.05, vignetteStrength = 0.55 }) {
  const frame = useCurrentFrame();
  const grainStep = Math.floor(frame / 4);
  const turbulenceSeed = Math.floor(random(`grain-${grainStep}`) * 999);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 15 }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${vignetteStrength}) 100%)`,
        }}
      />
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, mixBlendMode: 'overlay' }}>
        <filter id="film-grain-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={turbulenceSeed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#film-grain-filter)" />
      </svg>
    </AbsoluteFill>
  );
}
