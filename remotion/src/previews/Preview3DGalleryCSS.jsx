import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';
import { COLORS } from '../theme.js';
import { FONT_SERIF, FONT_SANS } from '../fonts.js';
import KenBurnsImage from '../components/KenBurnsImage.jsx';
import Scrim from '../components/Scrim.jsx';
import { reelData } from '../data.js';

const PER_PROJECT_FRAMES = 105;
const CROSSFADE_FRAMES = 18;
const EASE_CROSS = Easing.inOut(Easing.cubic);

// CSS-3D variant of ProjectsMontage.jsx — each plate swings in on rotateY/
// translateZ (spring-driven, since video has no cursor to drive a mouse-tilt
// the way ProjectCard.jsx does on the live site) before easing flat and
// crossfading, same "gallery panel being placed on the wall" idea as the
// live site's ExhibitDolly.jsx, translated to a render-time-only technique
// (plain CSS, zero new dependencies).
export default function Preview3DGalleryCSS() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const projects = reelData.showcaseProjects;
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
  const inOpacity = nextProject ? crossT : 0;

  const swingIn = spring({ frame: localFrame, fps, config: { damping: 18, stiffness: 60, mass: 1.1 } });
  const swingOut = spring({ frame: localFrame - (PER_PROJECT_FRAMES - CROSSFADE_FRAMES), fps, config: { damping: 20, stiffness: 90 } });

  const tiltDeg = interpolate(swingIn, [0, 1], [-34, 0]) + swingOut * 22;
  const zDepth = interpolate(swingIn, [0, 1], [-420, 0]);

  if (!project) return null;

  return (
    <AbsoluteFill style={{ background: COLORS.ink, perspective: 1400 }}>
      <AbsoluteFill
        style={{
          opacity: outOpacity,
          transformStyle: 'preserve-3d',
          transform: `rotateY(${tiltDeg}deg) translateZ(${zDepth}px)`,
        }}
      >
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

      <AbsoluteFill style={{ justifyContent: 'flex-end', padding: '0 120px 100px' }}>
        <span style={{ fontFamily: FONT_SANS, fontSize: 18, textTransform: 'uppercase', color: COLORS.gold, marginBottom: 14 }}>
          {project.category} · {project.year}
        </span>
        <h2 style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: 72, color: COLORS.linen, margin: 0, maxWidth: 1200 }}>
          {project.title}
        </h2>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const PREVIEW_3D_GALLERY_CSS_FRAMES = PER_PROJECT_FRAMES * Math.min(3, reelData.showcaseProjects.length);
