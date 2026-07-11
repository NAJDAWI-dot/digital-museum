import React from 'react';
import { Img, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { resolveAsset } from '../assets.js';

const ORIGINS = [
  { scaleFrom: 1.12, scaleTo: 1.0, x: [2, -2], y: [1, -1] },
  { scaleFrom: 1.0, scaleTo: 1.14, x: [-3, 2], y: [-1, 2] },
  { scaleFrom: 1.08, scaleTo: 1.0, x: [-2, 3], y: [2, -2] },
  { scaleFrom: 1.0, scaleTo: 1.1, x: [3, -3], y: [-2, 1] },
];

// A real dolly/pan decelerates into and out of its move rather than holding
// constant velocity for the whole shot — the background (cover-fill) layer
// uses this ease. The foreground (the real, uncropped photo) eases on a
// distinct curve so the two layers drift at visibly different rates —
// that mismatch, not just the blur, is what reads as parallax depth.
const BG_EASE = Easing.inOut(Easing.cubic);
const FG_EASE = Easing.out(Easing.quad);

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
  const bgT = BG_EASE(Math.min(1, Math.max(0, t)));
  const fgT = FG_EASE(Math.min(1, Math.max(0, t)));

  const bgScale = interpolate(bgT, [0, 1], [scaleFrom * 1.15, scaleTo * 1.15], { extrapolateRight: 'clamp' });
  const bgX = interpolate(bgT, [0, 1], x, { extrapolateRight: 'clamp' });
  const bgY = interpolate(bgT, [0, 1], y, { extrapolateRight: 'clamp' });
  // Foreground stays scale-only, never panned — it's shown with
  // objectFit:contain specifically so the whole photo is always visible
  // uncropped, and any translate here would push part of it out of frame.
  const fgScale = interpolate(fgT, [0, 1], [1.0, 1.045], { extrapolateRight: 'clamp' });

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
