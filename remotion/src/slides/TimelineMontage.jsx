import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import GoldRule from '../components/GoldRule.jsx';

function Milestone({ entry, index }) {
  const frame = useCurrentFrame();
  const delay = 20 + index * 14;
  const opacity = interpolate(frame, [delay, delay + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = interpolate(frame, [delay, delay + 16], [-24, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 28, opacity, transform: `translateX(${x}px)`, marginBottom: 22 }}>
      <span style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.gold, minWidth: 90 }}>{entry.year}</span>
      <div>
        <div style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontSize: 34, color: COLORS.linen }}>{entry.title}</div>
        {entry.organization && (
          <div style={{ fontFamily: FONT_SANS, fontSize: 17, color: COLORS.dust, marginTop: 2 }}>{entry.organization}</div>
        )}
      </div>
    </div>
  );
}

export default function TimelineMontage({ timeline }) {
  const frame = useCurrentFrame();
  const headingOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const entries = timeline.slice(0, 4);

  return (
    <AbsoluteFill style={{ background: COLORS.ink, display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0 140px' }}>
      <div style={{ flex: '0 0 auto', marginRight: 100, opacity: headingOpacity }}>
        <GoldRule width={48} style={{ marginBottom: 22 }} />
        <span style={{ fontFamily: FONT_SANS, fontSize: 18, letterSpacing: 4, textTransform: 'uppercase', color: COLORS.gold, display: 'block' }}>
          Career
        </span>
        <h2 style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: 56, color: COLORS.linen, margin: '10px 0 0', maxWidth: 380 }}>
          The Path So Far
        </h2>
      </div>
      <div>
        {entries.map((entry, i) => (
          <Milestone key={entry.id} entry={entry} index={i} />
        ))}
      </div>
    </AbsoluteFill>
  );
}
