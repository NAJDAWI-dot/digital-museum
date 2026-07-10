import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { noise2D } from '@remotion/noise';
import { COLORS } from '../theme.js';

const COUNT = 26;

/** Slow-drifting gold motes, driven by Perlin noise rather than pure sine —
 * organic, non-repeating wander instead of an obviously looping orbit,
 * matching the ambient dust-mote field the site's own Hero.jsx renders on
 * a canvas. Pure functions of (seed, frame), so this stays perfectly
 * deterministic across however Remotion schedules frame rendering. */
export default function AtmosphereParticles({ opacity = 0.5 }) {
  const frame = useCurrentFrame();

  const particles = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        seed: `mote-${i}`,
        baseX: (noise2D(`x-${i}`, 0, 0) * 0.5 + 0.5) * 100,
        baseY: (noise2D(`y-${i}`, 0, 0) * 0.5 + 0.5) * 100,
        size: 1.2 + (noise2D(`s-${i}`, 0, 0) * 0.5 + 0.5) * 2.4,
        speed: 0.15 + (noise2D(`sp-${i}`, 0, 0) * 0.5 + 0.5) * 0.25,
      })),
    []
  );

  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {particles.map((p, i) => {
        const t = frame * p.speed * 0.01;
        const dx = noise2D(p.seed + '-x', t, 0) * 6;
        const dy = noise2D(p.seed + '-y', t, 0) * 6;
        const twinkle = 0.4 + (noise2D(p.seed + '-o', t * 2, 0) * 0.5 + 0.5) * 0.6;
        return (
          <circle
            key={i}
            cx={p.baseX + dx}
            cy={p.baseY + dy}
            r={p.size * 0.12}
            fill={COLORS.gold}
            opacity={twinkle}
          />
        );
      })}
    </svg>
  );
}
