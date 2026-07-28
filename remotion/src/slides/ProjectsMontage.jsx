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
import { PROJECTS_MONTAGE_SHOT_FRAMES, buildProjectShotList } from '../reel-timing.js';

const SPACING = 6; // world units between plates along the corridor's Z axis
const MAX_W = 3.5; // each plate's photo is *contained* within this box —
const MAX_H = 2.15; // never cropped or stretched, whatever its native aspect.

/** A single framed print: dark mat, thin gold bevel, and the full photo
 * sized to fit inside MAX_W x MAX_H at its own aspect ratio.
 *
 * Timing is not this component's business any more — the camera owns the
 * rhythm now, and a plate that also animated on its own schedule would fight
 * it. It just renders at whatever scale it is handed.
 *
 * Plates are never unmounted, only hidden. useTexture suspends while it
 * loads, and a texture suspending part-way through a render is a frame-
 * capture hazard; worse, you cannot hard-cut TO a plate whose texture has not
 * arrived. Hiding the distant ones keeps every texture resident while still
 * skipping the draw calls — which is also a real saving, since all twelve to
 * twenty-four plates used to draw on every single frame. */
function Plate({ src, z, x = 0, zoom = 1, visible = true }) {
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
    <group position={[x, 0, z]} scale={zoom} visible={visible}>
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

const GLIDE_FRACTION = 0.55; // how much of a soft shot is spent arriving
const PUSH_UNITS = 0.55;
const TIGHT_UNITS = 1.15; // a punch-in sits this much closer
const LATERAL_UNITS = 0.28;
const PLATE_X = 0.7; // prints hang alternately left and right of the walkway

const smoothstep = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Where the camera is, for a given frame.
 *
 * The corridor is a place: plates keep fixed positions along Z, and the
 * camera walks through them. That was true before as well, but the walk was a
 * single continuous function of frame, which is precisely what made cutting
 * impossible — the dolly had to reach exactly k*SPACING on schedule for the
 * captions
 * to stay in sync, so the camera could never be anywhere unexpected.
 *
 * Now the pose is a function of (which shot, how far into it). A soft shot
 * glides from the previous plate; a hard shot is simply *at* its plate on its
 * first frame, which is the cut. The world does not rearrange — the camera
 * jumps — so the room stays legible even when the edit does not.
 */
function cameraForFrame(shots, frame) {
  if (!shots.length) return { x: 0, z: 0, plateIndex: 0, shotIndex: 0 };

  let index = shots.findIndex(s => frame < s.startFrame + s.durationInFrames);
  if (index === -1) index = shots.length - 1;

  const shot = shots[index];
  const prev = shots[index - 1];
  const local = frame - shot.startFrame;
  const t = clamp01(local / Math.max(1, shot.durationInFrames));

  const station = (shot.plateIndex ?? index) * SPACING;
  let z = station;

  // A soft arrival glides in from wherever the camera was; a hard one is
  // already there.
  if (shot.cutIn !== 'hard' && prev) {
    const from = (prev.plateIndex ?? index - 1) * SPACING;
    z = from + (station - from) * smoothstep(clamp01(local / (shot.durationInFrames * GLIDE_FRACTION)));
  }

  // Moves are expressed as symbols in the EDL; the geometry lives here, so
  // any of this can be retuned without rebuilding a single edit.
  const eased = smoothstep(t);
  const plateIndex = shot.plateIndex ?? index;

  // Prints hang alternately either side of the walkway, so a plate is never
  // centred by default — that off-centre framing is the look. But the further
  // in the camera moves, the more that offset throws the subject out of
  // frame, so moving in has to re-centre as it goes. `recenter` is how much
  // of the plate's own offset this shot cancels.
  const plateX = plateIndex % 2 === 0 ? -PLATE_X : PLATE_X;
  let x = 0;
  let recenter = 0;

  switch (shot.move) {
    case 'push':
      z += PUSH_UNITS * eased;
      recenter = 0.45 * eased;
      break;
    case 'pull':
      z += PUSH_UNITS * (1 - eased);
      recenter = 0.45 * (1 - eased);
      break;
    case 'lateral':
      // Drift across the print, toward the middle of frame rather than
      // further off it — adding to the plate's own offset just walks the
      // subject out of shot.
      x = -Math.sign(plateX) * LATERAL_UNITS * (eased - 0.5) * 2;
      break;
    case 'hold':
      break;
    case 'dolly':
    default:
      z += 0.18 * eased;
      break;
  }

  // A punch-in is the same photograph, closer — and framed on it, which is
  // the whole point of pushing in.
  if (shot.framing === 'tight') {
    z += TIGHT_UNITS;
    recenter = 1;
  }

  x += -plateX * recenter;

  return { x, z, plateIndex, shotIndex: index };
}

/** Walks the rig through the corridor according to the shot list. */
function Corridor({ frame, plates, shots }) {
  const { x, z, plateIndex } = cameraForFrame(shots, frame);

  // Rate constants halved for 60fps (2x the frames per real second vs. the
  // 30fps they were originally tuned at) so the bob/sway speed is unchanged.
  const bobY = Math.sin(frame * 0.025) * 0.03;
  const swayX = Math.sin(frame * 0.0125) * 0.08;

  return (
    <group position={[swayX + x, bobY, z]}>
      {plates.map((plate, i) => (
        <Plate
          key={plate.key}
          src={plate.src}
          z={-i * SPACING}
          x={i % 2 === 0 ? -PLATE_X : PLATE_X}
          zoom={i === plateIndex ? 1.03 : 1}
          visible={Math.abs(i - plateIndex) <= 2}
        />
      ))}
    </group>
  );
}

/** Cycles through the collection's showcase projects via a real 3D dolly
 * through a corridor of framed prints — camera walks forward through the
 * gallery according to the EDL's shot list — variable shot lengths, camera
 * moves, hard cuts within a project's own photos, and punch-ins. Captions
 * crossfade per-*project* on top, holding steady across a project's interior
 * cuts, same TrackingIn/RevealText choreography the reel uses elsewhere. */
export default function ProjectsMontage({ projects, photosPerProject = 3, shots: edlShots = null }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const format = useFormat();

  const photoShots = useMemo(
    () => buildProjectShotList(projects, photosPerProject),
    [projects, photosPerProject],
  );

  // One plate per photograph, not per shot: a punch-in revisits a plate the
  // camera has already been to.
  const plates = useMemo(
    () => photoShots.map((s, i) => ({
      key: `${s.project?.id ?? s.projectIndex}-${s.shotIndexInProject}-${i}`,
      src: s.src,
      project: s.project,
      projectIndex: s.projectIndex,
    })),
    [photoShots],
  );

  // Without an EDL (a fresh clone, or a render whose EDL was rejected) fall
  // back to the even split this section always used.
  const shots = useMemo(() => {
    if (edlShots?.length) return edlShots;
    const per = Math.max(1, Math.floor((photoShots.length ? PROJECTS_MONTAGE_SHOT_FRAMES : 0)));
    return photoShots.map((s, i) => ({
      plateIndex: i,
      startFrame: i * per,
      durationInFrames: per,
      move: 'dolly',
      cutIn: 'soft',
      framing: 'wide',
    }));
  }, [edlShots, photoShots]);

  const { plateIndex } = cameraForFrame(shots, frame);
  const plate = plates[Math.min(plateIndex, plates.length - 1)];
  const project = plate?.project;
  const projectIndex = plate?.projectIndex ?? 0;

  // Caption timing follows the shot list rather than a fixed grid. A caption
  // belongs to a *project*, so it holds across that project's own interior
  // cuts — including punch-ins — and only re-animates when the project
  // changes. Re-animating on every cut is what would make a hard cut read as
  // a glitch rather than an edit.
  const { projectStartFrame, projectEndFrame } = useMemo(() => {
    const owner = (s) => plates[Math.min(s.plateIndex ?? 0, plates.length - 1)]?.project;
    const current = project;
    let start = 0;
    let end = shots.length ? shots[shots.length - 1].startFrame + shots[shots.length - 1].durationInFrames : 0;
    for (const s of shots) {
      if (owner(s) === current) { start = s.startFrame; break; }
    }
    for (let i = shots.length - 1; i >= 0; i--) {
      if (owner(shots[i]) === current) {
        end = shots[i].startFrame + shots[i].durationInFrames;
        break;
      }
    }
    // Keyed slightly BEFORE the boundary so the caption is already animating
    // in as the camera settles, rather than visibly trailing the photo.
    return { projectStartFrame: start - 10, projectEndFrame: end };
  }, [shots, plates, project]);

  const captionProgress = spring({ frame: frame - projectStartFrame, fps, config: { damping: 30, stiffness: 100, mass: 0.9 } });
  const counterProgress = spring({ frame: frame - projectStartFrame, fps, config: { damping: 200, stiffness: 110 } });
  const captionOut = interpolate(
    frame,
    [projectEndFrame - 40, projectEndFrame - 12],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  if (!project) return null;

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 2], fov: 55 }}>
        <ambientLight intensity={0.8} />
        <fog attach="fog" args={[COLORS.ink, 4, 14]} />
        <Corridor frame={frame} plates={plates} shots={shots} />
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
