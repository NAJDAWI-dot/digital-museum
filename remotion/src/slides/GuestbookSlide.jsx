import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import CountUp from '../components/CountUp.jsx';
import GoldRule from '../components/GoldRule.jsx';
import TrackingIn from '../components/TrackingIn.jsx';
import SlideDrift from '../components/SlideDrift.jsx';
import { GUESTBOOK_FRAMES } from '../durations.js';
import { useFormat, fmt } from '../format.jsx';

const MAX_NAMES_SHOWN = 48;

function NameTag({ name, index }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = 26 + index * 2;
  // Bouncy pop (visible overshoot) — each signature stamps itself onto the
  // wall rather than drifting in, like a visitor pressing their name in.
  const pop = spring({ frame: frame - delay, fps, config: { damping: 13, stiffness: 190, mass: 0.6 } });
  const settled = spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 140 } });

  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: FONT_SANS,
        fontSize: 19,
        color: COLORS.mist,
        opacity: 0.55 + settled * 0.45,
        transform: `scale(${0.6 + pop * 0.4})`,
        padding: '5px 14px',
        border: `1px solid rgba(201,169,110,${0.15 + settled * 0.15})`,
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
  const { fps } = useVideoConfig();
  const format = useFormat();
  const headingProgress = spring({ frame, fps, config: { damping: 200, stiffness: 80 } });
  const countPop = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 120, mass: 0.8 } });
  const quoteProgress = spring({ frame: frame - 72, fps, config: { damping: 200, stiffness: 90 } });

  const shown = names.slice(0, fmt(format, MAX_NAMES_SHOWN, 24));
  const overflow = names.length - shown.length;

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <SlideDrift durationInFrames={GUESTBOOK_FRAMES} direction="in" amount={0.025}>
        <AbsoluteFill
          style={{
            background: `radial-gradient(1200px 800px at 50% 30%, ${COLORS.inkLight}, ${COLORS.ink})`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: fmt(format, '0 140px', '0 60px'),
          }}
        >
          <span style={{ fontFamily: FONT_SANS, fontSize: 18, textTransform: 'uppercase', color: COLORS.gold, opacity: headingProgress, marginBottom: 14 }}>
            <TrackingIn text="The Guestbook" startFrame={2} letterSpacing={4} />
          </span>
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontWeight: 300,
              fontSize: 84,
              color: COLORS.linen,
              lineHeight: 1,
              transform: `scale(${0.9 + countPop * 0.1})`,
            }}
          >
            <CountUp to={count} startFrame={6} durationInFrames={30} />
            <span style={{ fontSize: 26, color: COLORS.dust, fontStyle: 'italic', marginLeft: 12 }}>
              {count === 1 ? 'signature' : 'signatures'}
            </span>
          </div>

          {shown.length > 0 && (
            <div style={{ marginTop: 30, maxWidth: 1300, lineHeight: 1.9 }}>
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
            <div
              style={{
                opacity: quoteProgress,
                transform: `translateY(${(1 - quoteProgress) * 14}px)`,
                marginTop: 34,
                maxWidth: 800,
              }}
            >
              <GoldRule width={36} startFrame={70} style={{ margin: '0 auto 16px' }} />
              <p style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontSize: 24, color: COLORS.mist, margin: 0 }}>
                “{quote.message}” — {quote.name}
              </p>
            </div>
          )}
        </AbsoluteFill>
      </SlideDrift>
    </AbsoluteFill>
  );
}
