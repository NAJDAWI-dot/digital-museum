import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import RevealText from '../components/RevealText.jsx';
import GoldRule from '../components/GoldRule.jsx';
import AtmosphereParticles from '../components/AtmosphereParticles.jsx';

export default function TitleSlide({ siteName, projectCount }) {
  const frame = useCurrentFrame();
  const ruleWidth = interpolate(frame, [10, 40], [0, 64], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const kickerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1400px 900px at 50% 40%, ${COLORS.inkLight}, ${COLORS.ink})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <AtmosphereParticles opacity={0.4} />
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: 22,
          letterSpacing: 6,
          textTransform: 'uppercase',
          color: COLORS.gold,
          opacity: kickerOpacity,
          marginBottom: 28,
        }}
      >
        The Archives Present
      </span>
      <h1
        style={{
          fontFamily: FONT_SERIF,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 108,
          color: COLORS.linen,
          margin: 0,
          lineHeight: 1.05,
        }}
      >
        <RevealText text={siteName} startFrame={12} stagger={4} />
      </h1>
      <GoldRule width={ruleWidth} style={{ margin: '34px 0' }} />
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: 20,
          letterSpacing: 2,
          color: COLORS.dust,
          opacity: interpolate(frame, [45, 65], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        {projectCount} exhibits, and counting
      </span>
    </AbsoluteFill>
  );
}
