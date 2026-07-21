import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useTexture } from '@react-three/drei';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import { resolveAsset } from '../assets.js';
import { reelData } from '../data.js';

const PER_PROJECT_FRAMES = 105;
const SPACING = 6; // world units between plates along Z
const MAX_W = 3.5; // plate bounding box — the photo is *contained* inside
const MAX_H = 2.15; // this, never cropped, whatever its native aspect ratio

// Echoes the live site's ExhibitDolly.jsx corridor: project cover images as
// textured planes stacked in Z, camera dollying forward through them —
// rendered on a fixed timeline here instead of scroll-driven. Each plate is
// framed like a museum print: a dark mat, a thin gold bevel, and the full,
// uncropped photo sized to fit (never stretched or clipped to a fixed
// aspect ratio, the way a naive fixed-size plane would).
function Plate({ src, z, x = 0 }) {
  const resolved = resolveAsset(src);
  const texture = useTexture(resolved);
  const img = texture.image;
  const aspect = img && img.width && img.height ? img.width / img.height : MAX_W / MAX_H;

  let w = MAX_W;
  let h = MAX_W / aspect;
  if (h > MAX_H) {
    h = MAX_H;
    w = MAX_H * aspect;
  }

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[MAX_W + 0.5, MAX_H + 0.5]} />
        <meshBasicMaterial color={COLORS.inkLight} />
      </mesh>
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[w + 0.16, h + 0.16]} />
        <meshBasicMaterial color={COLORS.gold} />
      </mesh>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Corridor({ frame, projects }) {
  // Plates sit at local z = -i*SPACING (each one further back than the
  // last). The group offset must grow POSITIVE over time to bring each in
  // turn up to the camera near z=0 — a negative-going offset (the original
  // bug here) pushes everything further away instead, so plate 0 stays the
  // nearest, and therefore the only one visible, for the entire duration
  // while the frame-driven captions keep advancing on their own.
  const dollyZ = interpolate(
    frame,
    [0, projects.length * PER_PROJECT_FRAMES],
    [0, (projects.length - 1) * SPACING],
    { easing: Easing.inOut(Easing.cubic), extrapolateRight: 'clamp' }
  );
  // A faint bob and sway — a corridor walked at a fixed dolly speed with a
  // perfectly locked-off camera reads as a slideshow, not a museum walk-through.
  const bobY = Math.sin(frame * 0.05) * 0.03;
  const swayX = Math.sin(frame * 0.025) * 0.08;

  return (
    <group position={[swayX, bobY, dollyZ]}>
      {projects.map((p, i) => {
        const offsetX = i % 2 === 0 ? -0.7 : 0.7;
        return p.coverImage ? (
          <Plate key={p.id || i} src={p.coverImage} z={-i * SPACING} x={offsetX} />
        ) : null;
      })}
    </group>
  );
}

export default function Preview3DGalleryWebGL() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const projects = useMemo(() => reelData.showcaseProjects.slice(0, 4), []);
  const index = Math.min(projects.length - 1, Math.floor(frame / PER_PROJECT_FRAMES));
  const project = projects[index];
  const localFrame = frame - index * PER_PROJECT_FRAMES;
  const captionProgress = spring({ frame: localFrame - 6, fps, config: { damping: 30, stiffness: 100, mass: 0.9 } });
  const captionOut = interpolate(localFrame, [PER_PROJECT_FRAMES - 20, PER_PROJECT_FRAMES - 6], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <ThreeCanvas width={1920} height={1080} camera={{ position: [0, 0, 2], fov: 55 }}>
        <ambientLight intensity={0.8} />
        <fog attach="fog" args={[COLORS.ink, 4, 14]} />
        <Corridor frame={frame} projects={projects} />
      </ThreeCanvas>

      {project && (
        <AbsoluteFill style={{ justifyContent: 'flex-end', padding: '0 120px 100px', opacity: captionProgress * captionOut }}>
          <div
            style={{
              position: 'absolute',
              top: 84,
              right: 120,
              fontFamily: FONT_SANS,
              fontSize: 19,
              letterSpacing: 3,
              color: COLORS.dust,
            }}
          >
            <span style={{ color: COLORS.gold }}>{String(index + 1).padStart(2, '0')}</span>
            {' / '}
            {String(projects.length).padStart(2, '0')}
          </div>
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 18,
              textTransform: 'uppercase',
              color: COLORS.gold,
              marginBottom: 14,
              transform: `translateY(${(1 - captionProgress) * 14}px)`,
            }}
          >
            {project.category} · {project.year}
          </span>
          <h2
            style={{
              fontFamily: FONT_SERIF,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 64,
              color: COLORS.linen,
              margin: 0,
              maxWidth: 1200,
              transform: `translateY(${(1 - captionProgress) * 14}px)`,
            }}
          >
            {project.title}
          </h2>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

export const PREVIEW_3D_GALLERY_WEBGL_FRAMES = PER_PROJECT_FRAMES * 4;
