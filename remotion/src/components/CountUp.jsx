import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { EASE_PRECISE } from '../theme.js';

/** Animated number count-up, eased to a soft stop rather than a linear
 * ramp — reads as deliberate, not like a loading spinner. */
export default function CountUp({ to, startFrame = 0, durationInFrames = 90, style }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - startFrame;

  const progress = spring({
    frame: localFrame,
    fps,
    config: { damping: 200, stiffness: 90, mass: 1 },
    durationInFrames,
  });

  const value = Math.round(
    interpolate(progress, [0, 1], [0, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  );

  return <span style={style}>{value.toLocaleString()}</span>;
}
