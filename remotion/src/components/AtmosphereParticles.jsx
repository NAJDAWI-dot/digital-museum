import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { noise2D } from '@remotion/noise';
import { COLORS } from '../theme.js';
import useAudioPulse from '../hooks/useAudioPulse.js';

// Three depth bands (far/mid/near) rather than one flat scatter plane —
// far motes are larger-but-blurred and drift slowest, near motes are
// small, sharp, and drift fastest, giving the field real dimensional
// depth instead of everything wandering on the same plane.
const BANDS = [
  { count: 8, sizeRange: [2.6, 4.2], speedRange: [0.05, 0.1], blur: 3, opacityMul: 0.5 },
  { count: 10, sizeRange: [1.4, 2.6], speedRange: [0.12, 0.22], blur: 1, opacityMul: 0.8 },
  { count: 8, sizeRange: [0.6, 1.4], speedRange: [0.22, 0.4], blur: 0, opacityMul: 1 },
];

/** Slow-drifting gold motes, driven by Perlin noise rather than pure sine —
 * organic, non-repeating wander instead of an obviously looping orbit,
 * matching the ambient dust-mote field the site's own Hero.jsx renders on
 * a canvas. Pure functions of (seed, frame), so this stays perfectly
 * deterministic across however Remotion schedules frame rendering.
 * Brightness gets a gentle boost from the actual selected score's bass
 * (useAudioPulse) so the field visibly breathes with the music. */
export default function AtmosphereParticles({ opacity = 0.5 }) {
  const frame = useCurrentFrame();
  const pulse = useAudioPulse();

  const bands = useMemo(
    () =>
      BANDS.map((band, bandIndex) =>
        Array.from({ length: band.count }, (_, i) => {
          const seed = `mote-${bandIndex}-${i}`;
          return {
            seed,
            baseX: (noise2D(`x-${seed}`, 0, 0) * 0.5 + 0.5) * 100,
            baseY: (noise2D(`y-${seed}`, 0, 0) * 0.5 + 0.5) * 100,
            size: band.sizeRange[0] + (noise2D(`s-${seed}`, 0, 0) * 0.5 + 0.5) * (band.sizeRange[1] - band.sizeRange[0]),
            speed: band.speedRange[0] + (noise2D(`sp-${seed}`, 0, 0) * 0.5 + 0.5) * (band.speedRange[1] - band.speedRange[0]),
            blur: band.blur,
            opacityMul: band.opacityMul,
          };
        })
      ),
    []
  );

  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {bands.map((particles, bandIndex) =>
        particles.map((p, i) => {
          const t = frame * p.speed * 0.01;
          const dx = noise2D(p.seed + '-x', t, 0) * 6;
          const dy = noise2D(p.seed + '-y', t, 0) * 6;
          const twinkle = 0.4 + (noise2D(p.seed + '-o', t * 2, 0) * 0.5 + 0.5) * 0.6;
          return (
            <circle
              key={`${bandIndex}-${i}`}
              cx={p.baseX + dx}
              cy={p.baseY + dy}
              r={p.size * 0.12 * (1 + pulse * 0.18)}
              fill={COLORS.gold}
              opacity={twinkle * p.opacityMul * (1 + pulse * 0.25)}
              style={p.blur ? { filter: `blur(${p.blur}px)` } : undefined}
            />
          );
        })
      )}
    </svg>
  );
}
