import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import GoldRule from '../components/GoldRule.jsx';

export default function TestimonialSlide({ testimonial }) {
  const frame = useCurrentFrame();
  const quoteOpacity = interpolate(frame, [8, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const quoteY = interpolate(frame, [8, 30], [14, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const attrOpacity = interpolate(frame, [34, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 800px at 50% 45%, ${COLORS.inkLight}, ${COLORS.ink})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 260px',
      }}
    >
      <span style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontSize: 96, color: COLORS.goldDark, lineHeight: 0.4, opacity: quoteOpacity }}>“</span>
      <p
        style={{
          fontFamily: FONT_SERIF,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 48,
          color: COLORS.linen,
          lineHeight: 1.4,
          opacity: quoteOpacity,
          transform: `translateY(${quoteY}px)`,
          margin: '20px 0 0',
        }}
      >
        {testimonial.quote}
      </p>
      <GoldRule width={48} style={{ margin: '32px 0 20px', opacity: attrOpacity }} />
      <span style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.gold, opacity: attrOpacity }}>{testimonial.name}</span>
      {testimonial.role && (
        <span style={{ fontFamily: FONT_SANS, fontSize: 16, color: COLORS.dust, marginTop: 6, opacity: attrOpacity }}>
          {testimonial.role}
        </span>
      )}
    </AbsoluteFill>
  );
}
