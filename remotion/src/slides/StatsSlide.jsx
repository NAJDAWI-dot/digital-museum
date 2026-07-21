import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import CountUp from '../components/CountUp.jsx';
import GoldRule from '../components/GoldRule.jsx';
import TrackingIn from '../components/TrackingIn.jsx';
import SlideDrift from '../components/SlideDrift.jsx';
import { STATS_FRAMES } from '../durations.js';
import { useFormat, fmt } from '../format.jsx';

function StatBlock({ value, label, delay }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const format = useFormat();
  // Slight overshoot (damping 16) so each number lands with a pop — these
  // are the reel's proudest figures, they should arrive with confidence.
  const progress = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 130, mass: 0.8 } });
  const settled = spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 110 } });

  return (
    <div
      style={{
        opacity: settled,
        transform: `translateY(${(1 - settled) * 24}px) scale(${0.85 + progress * 0.15})`,
        textAlign: 'center',
        padding: fmt(format, '0 56px', '18px 0'),
      }}
    >
      <div
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 300,
          fontSize: fmt(format, 108, 92),
          color: COLORS.gold,
          lineHeight: 1,
          textShadow: `0 0 ${interpolate(settled, [0, 1], [30, 0])}px ${COLORS.gold}88`,
        }}
      >
        <CountUp to={value} startFrame={delay} />
      </div>
      <GoldRule width={44} startFrame={delay + 28} style={{ margin: '20px auto 0' }} />
      <div style={{ fontFamily: FONT_SANS, fontSize: 18, letterSpacing: 3, textTransform: 'uppercase', color: COLORS.dust, marginTop: 16 }}>
        {label}
      </div>
    </div>
  );
}

export default function StatsSlide({ projectCount, categoryCount, timelineCount }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const format = useFormat();
  const headingProgress = spring({ frame, fps, config: { damping: 200, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <SlideDrift durationInFrames={STATS_FRAMES} direction="out">
        <AbsoluteFill
          style={{
            background: `radial-gradient(1200px 800px at 50% 30%, ${COLORS.inkLight}, ${COLORS.ink})`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GoldRule width={64} startFrame={4} style={{ marginBottom: 28 }} />
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 18,
              textTransform: 'uppercase',
              color: COLORS.gold,
              marginBottom: 56,
              opacity: headingProgress,
            }}
          >
            <TrackingIn text="The Collection, In Numbers" startFrame={8} letterSpacing={4} />
          </span>
          <div style={{ display: 'flex', flexDirection: fmt(format, 'row', 'column'), alignItems: fmt(format, 'flex-start', 'center') }}>
            <StatBlock value={projectCount} label="Exhibits" delay={28} />
            <StatBlock value={categoryCount} label="Disciplines" delay={48} />
            <StatBlock value={timelineCount} label="Milestones" delay={68} />
          </div>
        </AbsoluteFill>
      </SlideDrift>
    </AbsoluteFill>
  );
}
