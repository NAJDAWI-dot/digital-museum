import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import RevealText from '../components/RevealText.jsx';
import TrackingIn from '../components/TrackingIn.jsx';
import GoldRule from '../components/GoldRule.jsx';
import AtmosphereParticles3D from '../components/AtmosphereParticles3D.jsx';
import GoldEmblem3D from '../components/GoldEmblem3D.jsx';
import SlideDrift from '../components/SlideDrift.jsx';
import useAudioPulse from '../hooks/useAudioPulse.js';
import { TITLE_FRAMES } from '../durations.js';
import { useFormat, fmt } from '../format.jsx';

/** Opening choreography, beat by beat:
 * 0–15   room lights up (radial gradient blooms from black)
 * 4–     kicker tracks in from spread-wide letters
 * 12–    headline tips in word by word
 * 34–    gold rule inks itself outward with a flash
 * 45–    exhibit count settles in
 * throughout: slow push-in on the whole frame, motes breathing with the score */
export default function TitleSlide({ siteName, projectCount }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = useAudioPulse();
  const format = useFormat();

  const roomLight = interpolate(frame, [0, 36], [0, 1], { extrapolateRight: 'clamp' });
  const countProgress = spring({ frame: frame - 90, fps, config: { damping: 200, stiffness: 90 } });

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <SlideDrift durationInFrames={TITLE_FRAMES} direction="in">
        <AbsoluteFill
          style={{
            background: `radial-gradient(1400px 900px at 50% 40%, ${COLORS.inkLight}, ${COLORS.ink})`,
            opacity: roomLight,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <AtmosphereParticles3D opacity={0.4} width={fmt(format, 1920, 1080)} height={fmt(format, 1080, 1920)} />
          <GoldEmblem3D pulse={pulse} opacity={0.68} />
          {/* Text-shadow (not a background scrim box, which reads as a hard
              rectangle over the round coin) keeps the headline legible
              against the emblem's gold face while its rim/glow still shows
              through everywhere else. */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textShadow: `0 4px 28px ${COLORS.ink}, 0 2px 10px ${COLORS.ink}` }}>
            <span style={{ fontFamily: FONT_SANS, fontSize: fmt(format, 22, 19), textTransform: 'uppercase', color: COLORS.gold, marginBottom: 28 }}>
              <TrackingIn text="The Archives Present" startFrame={8} letterSpacing={fmt(format, 6, 4)} />
            </span>
            <h1
              style={{
                fontFamily: FONT_SERIF,
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: fmt(format, 108, 74),
                color: COLORS.linen,
                margin: 0,
                lineHeight: 1.05,
                padding: fmt(format, 0, '0 40px'),
                textAlign: 'center',
              }}
            >
              <RevealText text={siteName} startFrame={24} stagger={8} />
            </h1>
            <GoldRule width={64} startFrame={68} glow={pulse} style={{ margin: '34px 0' }} />
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: 20,
                letterSpacing: 2,
                color: COLORS.dust,
                opacity: countProgress,
                transform: `translateY(${(1 - countProgress) * 12}px)`,
              }}
            >
              {projectCount} exhibits, and counting
            </span>
          </div>
        </AbsoluteFill>
      </SlideDrift>
    </AbsoluteFill>
  );
}
