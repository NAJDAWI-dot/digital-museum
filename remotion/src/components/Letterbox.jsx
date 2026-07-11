import React from 'react';
import { useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../theme.js';

/** Thin cinematic bars — the single cheapest move that reads as "trailer"
 * rather than "screen recording". They glide in from off-frame during the
 * opening second (the classic "letterboxing engages" shot) instead of
 * simply existing from frame zero. */
export default function Letterbox({ height = 44 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 200, stiffness: 30 } });
  const offset = (1 - progress) * height;

  return (
    <>
      <div style={{ position: 'absolute', top: -offset, left: 0, right: 0, height, background: COLORS.ink, zIndex: 20 }} />
      <div style={{ position: 'absolute', bottom: -offset, left: 0, right: 0, height, background: COLORS.ink, zIndex: 20 }} />
    </>
  );
}
