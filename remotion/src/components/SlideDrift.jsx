import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

const EASE = Easing.inOut(Easing.sin);

/** Slow full-frame push-in (or pull-back) applied to a whole slide — the
 * "nothing on screen is ever completely still" rule that separates a
 * motion piece from a slide deck. Kept to ~3% over the slide's whole
 * duration so it reads as breath, not as a zoom. */
export default function SlideDrift({ children, durationInFrames, direction = 'in', amount = 0.03 }) {
  const frame = useCurrentFrame();
  const t = EASE(Math.min(1, Math.max(0, frame / durationInFrames)));
  const scale =
    direction === 'in'
      ? interpolate(t, [0, 1], [1, 1 + amount])
      : interpolate(t, [0, 1], [1 + amount, 1]);

  return <AbsoluteFill style={{ transform: `scale(${scale})` }}>{children}</AbsoluteFill>;
}
