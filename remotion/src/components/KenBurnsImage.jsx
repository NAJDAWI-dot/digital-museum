import React from 'react';
import { Img, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { resolveAsset } from '../assets.js';

const ORIGINS = [
  { scaleFrom: 1.12, scaleTo: 1.0, x: [2, -2], y: [1, -1] },
  { scaleFrom: 1.0, scaleTo: 1.14, x: [-3, 2], y: [-1, 2] },
  { scaleFrom: 1.08, scaleTo: 1.0, x: [-2, 3], y: [2, -2] },
  { scaleFrom: 1.0, scaleTo: 1.1, x: [3, -3], y: [-2, 1] },
];

/** Shows the whole image, uncropped — a blurred, slowly panning cover-fill
 * duplicate fills the frame behind it (so there's never dead letterbox
 * space around a differently-aspect-ratio screenshot), while the real
 * image sits centered on top at its full extent with only a gentle zoom,
 * never a pan that would suggest cropping. Wrapped in real per-frame
 * camera motion blur (standard 180° shutter, sampled sub-frames blended
 * together) — the single biggest visual tell between "professional edit"
 * and "CG slideshow" is whether moving elements blur the way a real
 * camera would. The offline render budget means this, the background
 * blur, and the extra sub-frame samples all cost nothing extra unlike the
 * same effect in a real-time browser. */
export default function KenBurnsImage({ src, durationInFrames, variant = 0, style }) {
  const frame = useCurrentFrame();
  const { durationInFrames: compDuration } = useVideoConfig();
  const total = durationInFrames ?? compDuration;
  const { scaleFrom, scaleTo, x, y } = ORIGINS[variant % ORIGINS.length];

  const t = frame / total;
  const bgScale = interpolate(t, [0, 1], [scaleFrom * 1.15, scaleTo * 1.15], { extrapolateRight: 'clamp' });
  const bgX = interpolate(t, [0, 1], x, { extrapolateRight: 'clamp' });
  const bgY = interpolate(t, [0, 1], y, { extrapolateRight: 'clamp' });
  const fgScale = interpolate(t, [0, 1], [1.0, 1.045], { extrapolateRight: 'clamp' });

  const resolved = resolveAsset(src);

  return (
    <CameraMotionBlur shutterAngle={180} samples={6}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}>
        <Img
          src={resolved}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(38px) brightness(0.55) saturate(1.15)',
            transform: `scale(${bgScale}) translate(${bgX}%, ${bgY}%)`,
          }}
        />
        <Img
          src={resolved}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: `scale(${fgScale})`,
            boxShadow: '0 30px 90px rgba(0,0,0,0.55)',
          }}
        />
      </div>
    </CameraMotionBlur>
  );
}
