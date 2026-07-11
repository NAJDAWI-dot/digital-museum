import React from 'react';
import { useCurrentFrame, spring, useVideoConfig } from 'remotion';

/** Uppercase kicker treatment: letters begin spread wide apart and blurred,
 * then the tracking settles inward as they sharpen and fade up — the
 * classic trailer "title card" entrance. Used for the small ALL-CAPS
 * labels above each slide's headline. */
export default function TrackingIn({ text, startFrame = 0, letterSpacing = 4, style }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 200, stiffness: 60 },
  });
  const spread = letterSpacing + (1 - progress) * 14;
  const blur = (1 - progress) * 4;

  return (
    <span
      style={{
        display: 'inline-block',
        opacity: progress,
        letterSpacing: spread,
        // Compensate for trailing letter-spacing so the text stays optically centered
        marginRight: -spread,
        filter: blur > 0.05 ? `blur(${blur}px)` : 'none',
        ...style,
      }}
    >
      {text}
    </span>
  );
}
