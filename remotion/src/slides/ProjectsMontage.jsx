import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import KenBurnsImage from '../components/KenBurnsImage.jsx';
import Scrim from '../components/Scrim.jsx';
import RevealText from '../components/RevealText.jsx';
import TrackingIn from '../components/TrackingIn.jsx';

const PER_PROJECT_FRAMES = 105; // 3.5s @ 30fps
const CROSSFADE_FRAMES = 18;
const EASE_CROSS = Easing.inOut(Easing.cubic);

/** Cycles through the collection's showcase projects, each held long enough
 * to read the title, given a Ken Burns drift, and crossfaded into the next —
 * a self-contained internal sequence rather than one TransitionSeries entry
 * per project, since it needs its own crossfade timing independent of the
 * reel's top-level section transitions. The outgoing shot also scales up a
 * touch as it dissolves (a dissolve-with-motion, not a static mix), and a
 * plate-number counter anchors the gallery-walkthrough feel. */
export default function ProjectsMontage({ projects }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const index = Math.min(projects.length - 1, Math.floor(frame / PER_PROJECT_FRAMES));
  const project = projects[index];
  const localFrame = frame - index * PER_PROJECT_FRAMES;
  const nextProject = projects[index + 1];

  const crossT = EASE_CROSS(
    interpolate(localFrame, [PER_PROJECT_FRAMES - CROSSFADE_FRAMES, PER_PROJECT_FRAMES], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const outOpacity = 1 - crossT;
  const outScale = 1 + crossT * 0.04;
  const inOpacity = nextProject ? crossT : 0;

  const captionProgress = spring({ frame: localFrame - 6, fps, config: { damping: 30, stiffness: 100, mass: 0.9 } });
  const counterProgress = spring({ frame: localFrame - 10, fps, config: { damping: 200, stiffness: 110 } });

  if (!project) return null;

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <AbsoluteFill style={{ opacity: outOpacity, transform: `scale(${outScale})` }}>
        {project.coverImage && (
          <KenBurnsImage src={project.coverImage} durationInFrames={PER_PROJECT_FRAMES} variant={index} />
        )}
        <Scrim />
      </AbsoluteFill>

      {nextProject && (
        <AbsoluteFill style={{ opacity: inOpacity }}>
          {nextProject.coverImage && (
            <KenBurnsImage src={nextProject.coverImage} durationInFrames={PER_PROJECT_FRAMES} variant={index + 1} />
          )}
          <Scrim />
        </AbsoluteFill>
      )}

      {/* Plate number, top right — like a gallery label */}
      <div
        style={{
          position: 'absolute',
          top: 84,
          right: 120,
          fontFamily: FONT_SANS,
          fontSize: 19,
          letterSpacing: 3,
          color: COLORS.dust,
          opacity: counterProgress * 0.9,
          transform: `translateY(${(1 - counterProgress) * -10}px)`,
        }}
      >
        <span style={{ color: COLORS.gold }}>{String(index + 1).padStart(2, '0')}</span>
        {' / '}
        {String(projects.length).padStart(2, '0')}
      </div>

      <AbsoluteFill style={{ justifyContent: 'flex-end', padding: '0 120px 100px' }}>
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: 18,
            textTransform: 'uppercase',
            color: COLORS.gold,
            marginBottom: 14,
          }}
        >
          <TrackingIn text={`${project.category} · ${project.year}`} startFrame={index * PER_PROJECT_FRAMES + 6} letterSpacing={4} />
        </span>
        <h2 style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: 72, color: COLORS.linen, margin: 0, maxWidth: 1200 }}>
          <RevealText text={project.title} startFrame={index * PER_PROJECT_FRAMES + 10} stagger={2} />
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

export const PROJECTS_MONTAGE_FRAMES_PER_ITEM = PER_PROJECT_FRAMES;
