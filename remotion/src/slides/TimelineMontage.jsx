import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import GoldRule from '../components/GoldRule.jsx';
import TrackingIn from '../components/TrackingIn.jsx';
import RevealText from '../components/RevealText.jsx';
import SlideDrift from '../components/SlideDrift.jsx';
import { TIMELINE_FRAMES } from '../durations.js';

const ROW_HEIGHT = 92; // milestone row + margin, for sizing the drawn spine

function Milestone({ entry, index }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = 24 + index * 14;
  const progress = spring({ frame: frame - delay, fps, config: { damping: 30, stiffness: 120, mass: 0.9 } });
  const dotPop = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 180, mass: 0.6 } });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 28,
        opacity: progress,
        transform: `translateX(${(1 - progress) * -30}px)`,
        marginBottom: 22,
        position: 'relative',
      }}
    >
      {/* node on the spine */}
      <span
        style={{
          position: 'absolute',
          left: -37,
          top: 10,
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: COLORS.gold,
          boxShadow: `0 0 12px ${COLORS.gold}88`,
          transform: `scale(${dotPop})`,
        }}
      />
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
  const { fps } = useVideoConfig();
  const headingProgress = spring({ frame, fps, config: { damping: 200, stiffness: 80 } });
  const entries = timeline.slice(0, 4);
  // The spine inks downward just ahead of the milestones appearing along it.
  const spineProgress = spring({ frame: frame - 18, fps, config: { damping: 200, stiffness: 50 } });

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <SlideDrift durationInFrames={TIMELINE_FRAMES} direction="in" amount={0.025}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0 140px' }}>
          <div style={{ flex: '0 0 auto', marginRight: 130, opacity: headingProgress }}>
            <GoldRule width={48} startFrame={2} style={{ marginBottom: 22 }} />
            <span style={{ fontFamily: FONT_SANS, fontSize: 18, textTransform: 'uppercase', color: COLORS.gold, display: 'block' }}>
              <TrackingIn text="Career" startFrame={4} letterSpacing={4} />
            </span>
            <h2 style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: 56, color: COLORS.linen, margin: '10px 0 0', maxWidth: 380 }}>
              <RevealText text="The Path So Far" startFrame={8} stagger={3} />
            </h2>
          </div>
          <div style={{ position: 'relative' }}>
            {/* drawn spine the milestones hang off */}
            <div
              style={{
                position: 'absolute',
                left: -33,
                top: 6,
                width: 1,
                height: entries.length * ROW_HEIGHT * spineProgress,
                background: `linear-gradient(180deg, ${COLORS.gold}, ${COLORS.goldDark}44)`,
              }}
            />
            {entries.map((entry, i) => (
              <Milestone key={entry.id} entry={entry} index={i} />
            ))}
          </div>
        </AbsoluteFill>
      </SlideDrift>
    </AbsoluteFill>
  );
}
