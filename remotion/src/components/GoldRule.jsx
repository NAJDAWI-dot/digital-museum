import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';
import { COLORS } from '../theme.js';

/** The gold hairline used under every heading. When given a startFrame it
 * draws itself in from the center outward with a brief bright flash that
 * cools to the resting gold — like a line being inked — rather than just
 * fading in. `glow` (0..1, usually the audio pulse) adds a soft halo. */
export default function GoldRule({ width = 64, style, glow = 0, startFrame = null }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let drawnWidth = width;
  let flash = 0;
  if (startFrame !== null) {
    const progress = spring({ frame: frame - startFrame, fps, config: { damping: 200, stiffness: 80 } });
    drawnWidth = width * progress;
    flash = interpolate(progress, [0.4, 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  }

  const glowAmount = Math.max(glow, flash * 0.8);

  return (
    <div
      style={{
        width: drawnWidth,
        height: 1,
        background: `linear-gradient(90deg, transparent, ${flash > 0.3 ? COLORS.goldLight : COLORS.gold}, transparent)`,
        boxShadow: glowAmount > 0.02 ? `0 0 ${6 + glowAmount * 16}px ${COLORS.gold}66` : 'none',
        ...style,
      }}
    />
  );
}
