import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import CountUp from '../components/CountUp.jsx';
import GoldRule from '../components/GoldRule.jsx';

const MAX_NAMES_SHOWN = 48;

function NameTag({ name, index }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = 24 + index * 2;
  const progress = spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 140 } });

  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: FONT_SANS,
        fontSize: 19,
        color: COLORS.mist,
        opacity: 0.55 + progress * 0.45,
        transform: `translateY(${(1 - progress) * 8}px)`,
        padding: '5px 14px',
        border: `1px solid rgba(201,169,110,${0.15 + progress * 0.15})`,
        borderRadius: 20,
        margin: 4,
      }}
    >
      {name}
    </span>
  );
}

export default function GuestbookSlide({ count, names, quote }) {
  const frame = useCurrentFrame();
  const headingOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const wallOpacity = interpolate(frame, [16, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const quoteOpacity = interpolate(frame, [70, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const shown = names.slice(0, MAX_NAMES_SHOWN);
  const overflow = names.length - shown.length;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 800px at 50% 30%, ${COLORS.inkLight}, ${COLORS.ink})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 140px',
      }}
    >
      <span style={{ fontFamily: FONT_SANS, fontSize: 18, letterSpacing: 4, textTransform: 'uppercase', color: COLORS.gold, opacity: headingOpacity, marginBottom: 14 }}>
        The Guestbook
      </span>
      <div style={{ fontFamily: FONT_SERIF, fontWeight: 300, fontSize: 84, color: COLORS.linen, lineHeight: 1 }}>
        <CountUp to={count} startFrame={6} durationInFrames={30} />
        <span style={{ fontSize: 26, color: COLORS.dust, fontStyle: 'italic', marginLeft: 12 }}>
          {count === 1 ? 'signature' : 'signatures'}
        </span>
      </div>

      {shown.length > 0 && (
        <div style={{ opacity: wallOpacity, marginTop: 30, maxWidth: 1300, lineHeight: 1.9 }}>
          {shown.map((name, i) => (
            <NameTag key={name + i} name={name} index={i} />
          ))}
          {overflow > 0 && (
            <span style={{ fontFamily: FONT_SANS, fontSize: 17, color: COLORS.goldDark, margin: 4, padding: '5px 10px' }}>
              +{overflow} more
            </span>
          )}
        </div>
      )}

      {quote && (
        <div style={{ opacity: quoteOpacity, marginTop: 34, maxWidth: 800 }}>
          <GoldRule width={36} style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontSize: 24, color: COLORS.mist, margin: 0 }}>
            “{quote.message}” — {quote.name}
          </p>
        </div>
      )}
    </AbsoluteFill>
  );
}
