import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import GoldRule from '../components/GoldRule.jsx';
import RevealText from '../components/RevealText.jsx';
import TrackingIn from '../components/TrackingIn.jsx';
import AtmosphereParticles3D from '../components/AtmosphereParticles3D.jsx';
import GoldEmblem3D from '../components/GoldEmblem3D.jsx';
import useAudioPulse from '../hooks/useAudioPulse.js';
import { END_CARD_FRAMES } from '../durations.js';
import { useFormat, fmt } from '../format.jsx';

export default function EndCard({ ownerName, totalLikes }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const format = useFormat();
  const pulse = useAudioPulse();
  const glowProgress = spring({ frame, fps, config: { damping: 200, stiffness: 40 }, durationInFrames: 180 });
  const glowScale = 0.85 + glowProgress * 0.25 + pulse * 0.08;
  const ctaProgress = spring({ frame: frame - 100, fps, config: { damping: 200, stiffness: 110 } });
  // The whole card sinks to black over the final second and a half — the
  // reel *ends*, it doesn't just stop.
  const fadeOut = interpolate(frame, [END_CARD_FRAMES - 80, END_CARD_FRAMES - 8], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: COLORS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <AbsoluteFill style={{ opacity: fadeOut, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AtmosphereParticles3D opacity={0.45} width={fmt(format, 1920, 1080)} height={fmt(format, 1080, 1920)} />
        <GoldEmblem3D pulse={pulse} opacity={0.68} />
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
        <div style={{ position: 'relative', textAlign: 'center', textShadow: `0 4px 28px ${COLORS.ink}, 0 2px 10px ${COLORS.ink}` }}>
          <span style={{ fontFamily: FONT_SANS, fontSize: 18, textTransform: 'uppercase', color: COLORS.gold }}>
            <TrackingIn text="Fin" startFrame={4} letterSpacing={6} />
          </span>
          <h1 style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: fmt(format, 96, 66), color: COLORS.linen, margin: '20px 0 0', padding: fmt(format, 0, '0 40px') }}>
            <RevealText text="Until the Next Exhibit" startFrame={20} stagger={6} />
          </h1>
          <GoldRule width={64} startFrame={84} style={{ margin: '36px auto' }} glow={pulse} />
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
