import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import GoldRule from '../components/GoldRule.jsx';
import RevealText from '../components/RevealText.jsx';
import SlideDrift from '../components/SlideDrift.jsx';
import { TESTIMONIAL_FRAMES } from '../durations.js';

export default function TestimonialSlide({ testimonial }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The big quote mark blooms in first — oversized, blurred, scaling down
  // into place — then the words of the quote follow one by one, so the
  // slide reads as someone *speaking*, not a paragraph appearing.
  const markProgress = spring({ frame: frame - 2, fps, config: { damping: 24, stiffness: 70, mass: 1.1 } });
  const attrProgress = spring({ frame: frame - 44, fps, config: { damping: 200, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <SlideDrift durationInFrames={TESTIMONIAL_FRAMES} direction="in" amount={0.025}>
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
          <span
            style={{
              fontFamily: FONT_SERIF,
              fontStyle: 'italic',
              fontSize: 96,
              color: COLORS.goldDark,
              lineHeight: 0.4,
              opacity: markProgress,
              transform: `scale(${1.8 - markProgress * 0.8})`,
              filter: markProgress < 0.9 ? `blur(${(1 - markProgress) * 6}px)` : 'none',
              textShadow: `0 0 40px ${COLORS.gold}44`,
            }}
          >
            “
          </span>
          <p
            style={{
              fontFamily: FONT_SERIF,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 48,
              color: COLORS.linen,
              lineHeight: 1.4,
              margin: '20px 0 0',
            }}
          >
            <RevealText text={testimonial.quote} startFrame={10} stagger={2} />
          </p>
          <GoldRule width={48} startFrame={40} style={{ margin: '32px 0 20px' }} />
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 20,
              color: COLORS.gold,
              opacity: attrProgress,
              transform: `translateY(${(1 - attrProgress) * 10}px)`,
            }}
          >
            {testimonial.name}
          </span>
          {testimonial.role && (
            <span style={{ fontFamily: FONT_SANS, fontSize: 16, color: COLORS.dust, marginTop: 6, opacity: attrProgress }}>
              {testimonial.role}
            </span>
          )}
        </AbsoluteFill>
      </SlideDrift>
    </AbsoluteFill>
  );
}
