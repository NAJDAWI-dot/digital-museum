import React from 'react';
import { useCurrentFrame, spring, useVideoConfig } from 'remotion';

/** Staggered word-by-word reveal — fade + rise + blur-settle + a slight
 * 3D tip-in (rotateX from 28° down to 0 around the word's baseline). The
 * blur-settle mirrors the site's own Hero.jsx focus-pull; the perspective
 * tip gives each word physical weight arriving on a surface, instead of
 * floating up out of nothing. */
export default function RevealText({ text, startFrame = 0, stagger = 3, style, wordStyle }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');

  return (
    <span style={{ perspective: 600, display: 'inline-block', ...style }}>
      {words.map((word, i) => {
        const localFrame = frame - startFrame - i * stagger;
        const progress = spring({
          frame: localFrame,
          fps,
          config: { damping: 30, stiffness: 110, mass: 0.9 },
        });
        const blur = interpolateBlur(progress);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: progress,
              transform: `translateY(${(1 - progress) * 30}px) rotateX(${(1 - progress) * 28}deg)`,
              transformOrigin: '50% 100%',
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
  return (1 - clamped) * 8;
}
