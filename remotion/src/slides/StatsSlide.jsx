import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import CountUp from '../components/CountUp.jsx';
import GoldRule from '../components/GoldRule.jsx';

function StatBlock({ value, label, delay }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y = interpolate(frame, [delay, delay + 18], [16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ opacity, transform: `translateY(${y}px)`, textAlign: 'center', padding: '0 56px' }}>
      <div style={{ fontFamily: FONT_SERIF, fontWeight: 300, fontSize: 108, color: COLORS.gold, lineHeight: 1 }}>
        <CountUp to={value} startFrame={delay} />
      </div>
      <div style={{ fontFamily: FONT_SANS, fontSize: 18, letterSpacing: 3, textTransform: 'uppercase', color: COLORS.dust, marginTop: 18 }}>
        {label}
      </div>
    </div>
  );
}

export default function StatsSlide({ projectCount, categoryCount, timelineCount }) {
  const frame = useCurrentFrame();
  const headingOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 800px at 50% 30%, ${COLORS.inkLight}, ${COLORS.ink})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <GoldRule width={64} style={{ marginBottom: 28, opacity: headingOpacity }} />
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: 18,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: COLORS.gold,
          opacity: headingOpacity,
          marginBottom: 56,
        }}
      >
        The Collection, In Numbers
      </span>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <StatBlock value={projectCount} label="Exhibits" delay={10} />
        <StatBlock value={categoryCount} label="Disciplines" delay={20} />
        <StatBlock value={timelineCount} label="Milestones" delay={30} />
      </div>
    </AbsoluteFill>
  );
}
