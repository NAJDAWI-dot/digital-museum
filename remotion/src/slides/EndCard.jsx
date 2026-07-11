import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import GoldRule from '../components/GoldRule.jsx';
import RevealText from '../components/RevealText.jsx';
import TrackingIn from '../components/TrackingIn.jsx';
import AtmosphereParticles from '../components/AtmosphereParticles.jsx';
import useAudioPulse from '../hooks/useAudioPulse.js';
import { END_CARD_FRAMES } from '../durations.js';

export default function EndCard({ ownerName, totalLikes }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = useAudioPulse();
  const glowProgress = spring({ frame, fps, config: { damping: 200, stiffness: 40 }, durationInFrames: 90 });
  const glowScale = 0.85 + glowProgress * 0.25 + pulse * 0.08;
  const ctaProgress = spring({ frame: frame - 50, fps, config: { damping: 200, stiffness: 110 } });
  // The whole card sinks to black over the final second and a half — the
  // reel *ends*, it doesn't just stop.
  const fadeOut = interpolate(frame, [END_CARD_FRAMES - 40, END_CARD_FRAMES - 4], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: COLORS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <AbsoluteFill style={{ opacity: fadeOut, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AtmosphereParticles opacity={0.45} />
        <div
          style={{
            position: 'absolute',
            width: 900,
            height: 900,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${COLORS.goldDark}33, transparent 70%)`,
            transform: `scale(${glowScale})`,
          }}
        />
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <span style={{ fontFamily: FONT_SANS, fontSize: 18, textTransform: 'uppercase', color: COLORS.gold }}>
            <TrackingIn text="Fin" startFrame={2} letterSpacing={6} />
          </span>
          <h1 style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 96, color: COLORS.linen, margin: '20px 0 0' }}>
            <RevealText text="Until the Next Exhibit" startFrame={10} stagger={3} />
          </h1>
          <GoldRule width={64} startFrame={42} style={{ margin: '36px auto' }} glow={pulse} />
          <p
            style={{
              fontFamily: FONT_SANS,
              fontSize: 20,
              color: COLORS.dust,
              opacity: ctaProgress,
              transform: `translateY(${(1 - ctaProgress) * 10}px)`,
              margin: 0,
            }}
          >
            {totalLikes > 0 ? `${totalLikes.toLocaleString()} appreciations from visitors like you` : 'Curated by ' + ownerName}
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
