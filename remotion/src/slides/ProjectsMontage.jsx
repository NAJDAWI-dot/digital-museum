import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useTexture } from '@react-three/drei';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import { resolveAsset } from '../assets.js';
import TrackingIn from '../components/TrackingIn.jsx';
import RevealText from '../components/RevealText.jsx';
import Scrim from '../components/Scrim.jsx';
import { useFormat, fmt } from '../format.jsx';

const SHOT_FRAMES = 210; // 3.5s @ 60fps — one photo's dwell time (renamed
// from PER_PROJECT_FRAMES: it's per-shot now, not per-project, since a
// project can contribute more than one photo — see buildProjectShotList).
const SPACING = 6; // world units between plates along the corridor's Z axis
const MAX_W = 3.5; // each plate's photo is *contained* within this box —
const MAX_H = 2.15; // never cropped or stretched, whatever its native aspect.

/** Flattens projects into a flat shot list — cover photo first, then up to
 * (photosPerProject - 1) screenshots — so the corridor can dolly through
 * every photo at an equal, fixed dwell time instead of just one cover shot
 * per project. photosPerProject=1 reproduces the original one-shot-per-
 * project behavior exactly. Exported so HighlightsReel.jsx's
 * calculateTotalFrames() can size the section off the same real shot count
 * this component actually renders — the two can never drift apart. */
export function buildProjectShotList(projects, photosPerProject = 3) {
  const cap = Math.max(1, Math.min(4, photosPerProject));
  const shots = [];
  projects.forEach((project, projectIndex) => {
    const extras = (project.screenshots || []).slice(0, cap - 1);
    const srcs = [project.coverImage, ...extras].filter(Boolean).slice(0, cap);
    srcs.forEach((src, shotIndexInProject) => {
      shots.push({ src, project, projectIndex, shotIndexInProject, shotsInProject: srcs.length });
    });
  });
  return shots;
}

/** A single framed print: dark mat, thin gold bevel, and the full photo
 * sized to fit inside MAX_W x MAX_H at its own aspect ratio. Slowly zooms
 * in (Ken-Burns-style) while it's the shot the dolly is currently settled
 * on, easing back out as the camera moves off toward the next one — a sine
 * bump peaking at the midpoint of this plate's own SHOT_FRAMES window, zero
 * at both edges so it never fights the dolly's own settle/release motion. */
function Plate({ src, z, x = 0, frame, shotStartFrame }) {
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

  const localT = Math.max(0, Math.min(1, (frame - shotStartFrame) / SHOT_FRAMES));
  const bump = Math.sin(Math.PI * localT); // 0 at both edges, 1 at the midpoint
  const zoom = 1 + 0.07 * bump;

  return (
    <group position={[x, 0, z]} scale={zoom}>
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

/** Dollies the whole rig forward through the corridor over the section's
 * full duration — plates sit at local z = -i*SPACING (each further back
 * than the last), and the group offset grows POSITIVE over time to bring
 * each one in turn up to the camera near z=0.
 *
 * Eased PER SEGMENT (smoothstep from shot i to shot i+1, each exactly
 * SHOT_FRAMES long), not globally — a global ease-in/out across the WHOLE
 * corridor badly distorts pacing once there are many shots (the ease-in
 * phase alone can still be mid-transition well past where several shots'
 * worth of frames have already elapsed), desyncing the visible plate from
 * shotIndex/captions. Smoothstep's zero-derivative at both ends of each
 * segment means dollyZ(k*SHOT_FRAMES) === k*SPACING exactly for every
 * integer k — so it stays in exact lockstep with the caption logic —
 * while reading as a "settle in front of each print, then glide to the
 * next" walk instead of a constant, mechanical crawl. */
function Corridor({ frame, shots }) {
  const maxUnit = Math.max(0, shots.length - 1);
  const rawUnit = Math.min(frame / SHOT_FRAMES, maxUnit);
  const segment = Math.min(maxUnit, Math.floor(rawUnit));
  const frac = rawUnit - segment;
  const smoothFrac = frac * frac * (3 - 2 * frac); // smoothstep
  const dollyZ = (segment + smoothFrac) * SPACING;

  // Rate constants halved for 60fps (2x the frames per real second vs. the
  // 30fps they were originally tuned at) so the bob/sway speed is unchanged.
  const bobY = Math.sin(frame * 0.025) * 0.03;
  const swayX = Math.sin(frame * 0.0125) * 0.08;

  return (
    <group position={[swayX, bobY, dollyZ]}>
      {shots.map((shot, i) => {
        const offsetX = i % 2 === 0 ? -0.7 : 0.7;
        return (
          <Plate
            key={`${shot.project.id || shot.projectIndex}-${shot.shotIndexInProject}`}
            src={shot.src}
            z={-i * SPACING}
            x={offsetX}
            frame={frame}
            shotStartFrame={i * SHOT_FRAMES}
          />
        );
      })}
    </group>
  );
}

/** Cycles through the collection's showcase projects via a real 3D dolly
 * through a corridor of framed prints — camera walks forward through the
 * gallery over the section's whole duration, one photo reached roughly
 * every SHOT_FRAMES, up to `photosPerProject` photos per project (cover +
 * screenshots). Captions crossfade per-*project* on top (holding steady
 * across a project's own interior photo cuts), same TrackingIn/RevealText
 * choreography the reel uses everywhere else. */
export default function ProjectsMontage({ projects, photosPerProject = 3 }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const format = useFormat();

  const shots = useMemo(() => buildProjectShotList(projects, photosPerProject), [projects, photosPerProject]);
  const shotIndex = Math.min(shots.length - 1, Math.floor(frame / SHOT_FRAMES));
  const shot = shots[shotIndex];
  const project = shot?.project;
  const projectStartShot = shot ? shotIndex - shot.shotIndexInProject : 0;
  const projectEndShot = shot ? projectStartShot + shot.shotsInProject - 1 : 0;
  const projectIndex = shot?.projectIndex ?? 0;

  // Captions used to start 12-20 frames AFTER the project's plate had
  // already fully arrived, plus the spring's own rise time on top — a
  // visible, cumulative lag between "new photo is up" and "text is
  // readable". Now keyed a little BEFORE the project boundary instead of
  // after it, so the caption is already animating in as the dolly settles
  // onto the new plate and both land together instead of the text visibly
  // trailing the photo.
  const projectStartFrame = projectStartShot * SHOT_FRAMES - 10;
  const captionProgress = spring({ frame: frame - projectStartFrame, fps, config: { damping: 30, stiffness: 100, mass: 0.9 } });
  const counterProgress = spring({ frame: frame - projectStartFrame, fps, config: { damping: 200, stiffness: 110 } });
  const captionOut = interpolate(
    frame,
    [(projectEndShot + 1) * SHOT_FRAMES - 40, (projectEndShot + 1) * SHOT_FRAMES - 12],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  if (!project) return null;

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 2], fov: 55 }}>
        <ambientLight intensity={0.8} />
        <fog attach="fog" args={[COLORS.ink, 4, 14]} />
        <Corridor frame={frame} shots={shots} />
      </ThreeCanvas>

      {/* Protects the caption's legibility against whatever 3D content
          happens to be behind it (a gold frame edge, a bright plate) —
          same role Scrim.jsx played under the old 2D KenBurns photo. */}
      <Scrim strength={0.75} />

      {/* Plate number, top right — like a gallery label. Stays project-
          level (not shot-level) — a 3-photo project is still "01/05". */}
      <div
        style={{
          position: 'absolute',
          top: fmt(format, 84, 64),
          right: fmt(format, 120, 48),
          fontFamily: FONT_SANS,
          fontSize: 19,
          letterSpacing: 3,
          color: COLORS.dust,
          opacity: counterProgress * captionOut * 0.9,
          transform: `translateY(${(1 - counterProgress) * -10}px)`,
        }}
      >
        <span style={{ color: COLORS.gold }}>{String(projectIndex + 1).padStart(2, '0')}</span>
        {' / '}
        {String(projects.length).padStart(2, '0')}
      </div>

      <AbsoluteFill style={{ justifyContent: 'flex-end', padding: fmt(format, '0 120px 100px', '0 56px 130px'), opacity: captionOut }}>
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: 18,
            textTransform: 'uppercase',
            color: COLORS.gold,
            marginBottom: 14,
          }}
        >
          <TrackingIn text={`${project.category} · ${project.year}`} startFrame={projectStartFrame} letterSpacing={4} />
        </span>
        <h2 style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: fmt(format, 64, 52), color: COLORS.linen, margin: 0, maxWidth: 1200 }}>
          <RevealText text={project.title} startFrame={projectStartFrame + 6} stagger={4} />
        </h2>
        {project.subtitle && (
          <p
            style={{
              fontFamily: FONT_SANS,
              fontSize: 22,
              color: COLORS.mist,
              marginTop: 16,
              maxWidth: 900,
              opacity: captionProgress,
              transform: `translateY(${(1 - captionProgress) * 14}px)`,
            }}
          >
            {project.subtitle}
          </p>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const PROJECTS_MONTAGE_SHOT_FRAMES = SHOT_FRAMES;
