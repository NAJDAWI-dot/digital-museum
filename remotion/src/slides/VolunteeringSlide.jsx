import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import { resolveAsset } from '../assets.js';
import CountUp from '../components/CountUp.jsx';
import GoldRule from '../components/GoldRule.jsx';
import TrackingIn from '../components/TrackingIn.jsx';
import SlideDrift from '../components/SlideDrift.jsx';
import { VOLUNTEERING_FRAMES } from '../durations.js';

const MAX_PHOTOS = 9;
// Mirrors the site's own tilted mat-framed print motif (Volunteering.css) —
// alternating tilts so the collage reads as pinned to a board, not a grid.
const TILTS = [-4, 3, -2.5, 5, -3.5, 2, -5, 3.5, -2];

function Print({ photo, index, delay }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Two springs: a settled one for opacity/fall, and a bouncier one that
  // lets each print over-rotate past its resting tilt and swing back — the
  // way a real photo tossed onto a board settles.
  const progress = spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 100 } });
  const swing = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 120, mass: 0.8 } });
  const tilt = TILTS[index % TILTS.length];
  const rotation = tilt + (1 - swing) * (tilt > 0 ? 14 : -14);

  return (
    <div
      style={{
        width: 260,
        height: 260,
        background: COLORS.paper,
        padding: 14,
        borderRadius: 2,
        boxShadow: `0 ${8 + progress * 12}px ${24 + progress * 20}px rgba(0,0,0,${0.35 + progress * 0.2})`,
        opacity: progress,
        transform: `translateY(${(1 - progress) * 44}px) rotate(${rotation}deg) scale(${0.86 + progress * 0.14})`,
      }}
    >
      <Img src={resolveAsset(photo.src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}

export default function VolunteeringSlide({ photos, count, orgCount }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headingProgress = spring({ frame, fps, config: { damping: 200, stiffness: 80 } });
  const shown = photos.slice(0, MAX_PHOTOS);

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <SlideDrift durationInFrames={VOLUNTEERING_FRAMES} direction="in" amount={0.025}>
        <AbsoluteFill
          style={{
            background: `radial-gradient(1400px 900px at 50% 40%, ${COLORS.inkLight}, ${COLORS.ink})`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ opacity: headingProgress, textAlign: 'center', marginBottom: 40 }}>
            <GoldRule width={48} startFrame={2} style={{ margin: '0 auto 20px' }} />
            <span style={{ fontFamily: FONT_SANS, fontSize: 18, textTransform: 'uppercase', color: COLORS.gold }}>
              <TrackingIn text="Wing of Service" startFrame={4} letterSpacing={4} />
            </span>
            <h2 style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: 52, color: COLORS.linen, margin: '14px 0 0' }}>
              <CountUp to={count} startFrame={6} durationInFrames={35} /> {count === 1 ? 'Contribution' : 'Contributions'}
              {orgCount > 0 && (
                <span style={{ fontSize: 26, color: COLORS.dust, fontStyle: 'normal' }}>
                  {' '}across {orgCount} {orgCount === 1 ? 'organization' : 'organizations'}
                </span>
              )}
            </h2>
          </div>

          {shown.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 22, maxWidth: 1500 }}>
              {shown.map((photo, i) => (
                <Print key={photo.src + i} photo={photo} index={i} delay={16 + i * 4} />
              ))}
            </div>
          ) : (
            <span style={{ fontFamily: FONT_SANS, fontSize: 18, color: COLORS.dust, opacity: headingProgress }}>
              Photographs from the field, coming soon.
            </span>
          )}
        </AbsoluteFill>
      </SlideDrift>
    </AbsoluteFill>
  );
}
