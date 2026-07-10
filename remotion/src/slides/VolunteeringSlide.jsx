import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import { resolveAsset } from '../assets.js';
import CountUp from '../components/CountUp.jsx';
import GoldRule from '../components/GoldRule.jsx';

const MAX_PHOTOS = 9;
// Mirrors the site's own tilted mat-framed print motif (Volunteering.css) —
// alternating tilts so the collage reads as pinned to a board, not a grid.
const TILTS = [-4, 3, -2.5, 5, -3.5, 2, -5, 3.5, -2];

function Print({ photo, index, delay }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 100 } });
  const tilt = TILTS[index % TILTS.length];

  return (
    <div
      style={{
        width: 260,
        height: 260,
        background: COLORS.paper,
        padding: 14,
        borderRadius: 2,
        boxShadow: '0 18px 40px rgba(0,0,0,0.55)',
        opacity: progress,
        transform: `translateY(${(1 - progress) * 30}px) rotate(${tilt}deg) scale(${0.9 + progress * 0.1})`,
      }}
    >
      <Img src={resolveAsset(photo.src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}

export default function VolunteeringSlide({ photos, count, orgCount }) {
  const frame = useCurrentFrame();
  const headingOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const shown = photos.slice(0, MAX_PHOTOS);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1400px 900px at 50% 40%, ${COLORS.inkLight}, ${COLORS.ink})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ opacity: headingOpacity, textAlign: 'center', marginBottom: 40 }}>
        <GoldRule width={48} style={{ margin: '0 auto 20px' }} />
        <span style={{ fontFamily: FONT_SANS, fontSize: 18, letterSpacing: 4, textTransform: 'uppercase', color: COLORS.gold }}>
          Wing of Service
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
        <span style={{ fontFamily: FONT_SANS, fontSize: 18, color: COLORS.dust, opacity: headingOpacity }}>
          Photographs from the field, coming soon.
        </span>
      )}
    </AbsoluteFill>
  );
}
