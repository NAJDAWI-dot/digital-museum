import React from 'react';
import { useCurrentFrame, spring, useVideoConfig } from 'remotion';

/** Staggered word-by-word reveal (fade + rise + blur-settle) — the same
 * device the site's own Hero.jsx uses for its headline (lineRise: blur(6px)
 * -> blur(0)), so type in the reel focus-pulls into sharpness exactly like
 * type on the site does, rather than just fading in flat. */
export default function RevealText({ text, startFrame = 0, stagger = 3, style, wordStyle }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');

  return (
    <span style={style}>
      {words.map((word, i) => {
        const localFrame = frame - startFrame - i * stagger;
        const progress = spring({
          frame: localFrame,
          fps,
          config: { damping: 200, stiffness: 120 },
        });
        const blur = interpolateBlur(progress);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: progress,
              transform: `translateY(${(1 - progress) * 22}px)`,
              filter: blur > 0.05 ? `blur(${blur}px)` : 'none',
              marginRight: '0.32em',
              ...wordStyle,
            }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
}

function interpolateBlur(progress) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (1 - clamped) * 7;
}
