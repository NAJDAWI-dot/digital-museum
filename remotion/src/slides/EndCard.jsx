import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import GoldRule from '../components/GoldRule.jsx';
import RevealText from '../components/RevealText.jsx';
import AtmosphereParticles from '../components/AtmosphereParticles.jsx';

export default function EndCard({ ownerName, totalLikes }) {
  const frame = useCurrentFrame();
  const glowScale = interpolate(frame, [0, 90], [0.85, 1.1], { extrapolateRight: 'clamp' });
  const ctaOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: COLORS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <AtmosphereParticles opacity={0.45} />
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.goldDark}33, transparent 70%)`,
          transform: `scale(${glowScale})`,
        }}
      />
      <div style={{ position: 'relative', textAlign: 'center' }}>
        <span style={{ fontFamily: FONT_SANS, fontSize: 18, letterSpacing: 6, textTransform: 'uppercase', color: COLORS.gold }}>
          Fin
        </span>
        <h1 style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 96, color: COLORS.linen, margin: '20px 0 0' }}>
          <RevealText text="Until the Next Exhibit" startFrame={10} stagger={3} />
        </h1>
        <GoldRule width={64} style={{ margin: '36px auto', opacity: ctaOpacity }} />
        <p style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.dust, opacity: ctaOpacity, margin: 0 }}>
          {totalLikes > 0 ? `${totalLikes.toLocaleString()} appreciations from visitors like you` : 'Curated by ' + ownerName}
        </p>
      </div>
    </AbsoluteFill>
  );
}
