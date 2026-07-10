import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import KenBurnsImage from '../components/KenBurnsImage.jsx';
import Scrim from '../components/Scrim.jsx';
import RevealText from '../components/RevealText.jsx';

const PER_PROJECT_FRAMES = 105; // 3.5s @ 30fps
const CROSSFADE_FRAMES = 18;

/** Cycles through the collection's showcase projects, each held long enough
 * to read the title, given a Ken Burns drift, and crossfaded into the next —
 * a self-contained internal sequence rather than one TransitionSeries entry
 * per project, since it needs its own crossfade timing independent of the
 * reel's top-level section transitions. */
export default function ProjectsMontage({ projects }) {
  const frame = useCurrentFrame();
  const index = Math.min(projects.length - 1, Math.floor(frame / PER_PROJECT_FRAMES));
  const project = projects[index];
  const localFrame = frame - index * PER_PROJECT_FRAMES;
  const nextProject = projects[index + 1];

  const outOpacity = interpolate(
    localFrame,
    [PER_PROJECT_FRAMES - CROSSFADE_FRAMES, PER_PROJECT_FRAMES],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const inOpacity = nextProject
    ? interpolate(
        localFrame,
        [PER_PROJECT_FRAMES - CROSSFADE_FRAMES, PER_PROJECT_FRAMES],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      )
    : 0;

  const captionOpacity = interpolate(localFrame, [8, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  if (!project) return null;

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <AbsoluteFill style={{ opacity: outOpacity }}>
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

      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          padding: '0 120px 100px',
          opacity: captionOpacity,
        }}
      >
        <span style={{ fontFamily: FONT_SANS, fontSize: 18, letterSpacing: 4, textTransform: 'uppercase', color: COLORS.gold, marginBottom: 14 }}>
          {project.category} · {project.year}
        </span>
        <h2 style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: 72, color: COLORS.linen, margin: 0, maxWidth: 1200 }}>
          <RevealText text={project.title} startFrame={0} stagger={2} />
        </h2>
        {project.subtitle && (
          <p style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.mist, marginTop: 16, maxWidth: 900 }}>
            {project.subtitle}
          </p>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const PROJECTS_MONTAGE_FRAMES_PER_ITEM = PER_PROJECT_FRAMES;
