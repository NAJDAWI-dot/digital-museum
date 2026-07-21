import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../theme.js';
import AtmosphereParticles3D from '../components/AtmosphereParticles3D.jsx';

// Sandbox composition — never imported by HighlightsReel.jsx. Lets the real
// TitleSlide/EndCard background swap in the 3D particle field for a look
// before wiring it into the actual reel.
export default function Preview3DParticles() {
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1400px 900px at 50% 40%, ${COLORS.inkLight}, ${COLORS.ink})` }}>
      <AtmosphereParticles3D opacity={0.9} />
    </AbsoluteFill>
  );
}

export const PREVIEW_3D_PARTICLES_FRAMES = 150;
