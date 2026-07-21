import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import GoldEmblem3D from '../components/GoldEmblem3D.jsx';
import useAudioPulse from '../hooks/useAudioPulse.js';

// Sandbox for the TitleSlide/EndCard treatment: rotating gold seal behind
// the existing 2D headline text, not replacing it.
export default function Preview3DEmblem() {
  const frame = useCurrentFrame();
  const pulse = useAudioPulse();
  const roomLight = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1400px 900px at 50% 40%, ${COLORS.inkLight}, ${COLORS.ink})`,
        opacity: roomLight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <GoldEmblem3D pulse={pulse} opacity={0.68} />
      {/* A drop-shadow on the text (not a background box, which read as a
          hard-edged rectangle over the round coin) keeps the headline
          legible against the coin face while letting its rim/glow show
          through everywhere else. */}
      <div style={{ position: 'relative', textAlign: 'center', textShadow: `0 4px 28px ${COLORS.ink}, 0 2px 10px ${COLORS.ink}` }}>
        <span style={{ fontFamily: FONT_SANS, fontSize: 22, textTransform: 'uppercase', color: COLORS.gold, marginBottom: 28, display: 'block' }}>
          The Archives Present
        </span>
        <h1 style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: 108, color: COLORS.linen, margin: 0 }}>
          The Najdawi Collection
        </h1>
      </div>
    </AbsoluteFill>
  );
}

export const PREVIEW_3D_EMBLEM_FRAMES = 150;
