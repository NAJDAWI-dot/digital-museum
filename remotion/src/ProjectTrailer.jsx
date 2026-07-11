import React from 'react';
import { AbsoluteFill, Audio, staticFile, interpolate, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS } from './theme.js';
import { FONT_SERIF, FONT_SANS } from './fonts.js';
import { reelData } from './data.js';
import KenBurnsImage from './components/KenBurnsImage.jsx';
import Scrim from './components/Scrim.jsx';
import RevealText from './components/RevealText.jsx';
import TrackingIn from './components/TrackingIn.jsx';
import FilmGrain from './components/FilmGrain.jsx';
import GoldRule from './components/GoldRule.jsx';
import Letterbox from './components/Letterbox.jsx';

export const TRAILER_FRAMES = 450; // 15s @ 30fps

/** 15-second teaser for one exhibit — the whole shot is a single slow
 * Ken Burns hold on the cover image with the reel's caption language, a
 * closing site-URL tag, and the same score/grain/letterbox treatment, so
 * every trailer is unmistakably a cut from the same film. */
export default function ProjectTrailer({ projectId }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const project =
    reelData.projects.find(p => p.id === projectId) || reelData.projects[0];
  if (!project) return null;

  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [TRAILER_FRAMES - 30, TRAILER_FRAMES - 4], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tagProgress = spring({ frame: frame - 360, fps, config: { damping: 200, stiffness: 90 } });

  const volume = (f) =>
    Math.min(
      interpolate(f, [0, 30], [0, 0.9], { extrapolateRight: 'clamp' }),
      interpolate(f, [TRAILER_FRAMES - 45, TRAILER_FRAMES], [0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    );

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <Audio src={staticFile('audio/theme.mp3')} volume={volume} />

      <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
        {project.coverImage && (
          <KenBurnsImage src={project.coverImage} durationInFrames={TRAILER_FRAMES} variant={1} />
        )}
        <Scrim />

        <AbsoluteFill style={{ justifyContent: 'flex-end', padding: '0 120px 110px' }}>
          <span style={{ fontFamily: FONT_SANS, fontSize: 18, textTransform: 'uppercase', color: COLORS.gold, marginBottom: 14 }}>
            <TrackingIn text={`${project.category || 'Exhibit'} · ${project.year || ''}`} startFrame={14} letterSpacing={4} />
          </span>
          <h1 style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: 84, color: COLORS.linen, margin: 0, maxWidth: 1300 }}>
            <RevealText text={project.title} startFrame={22} stagger={3} />
          </h1>
          {project.subtitle && (
            <p style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.mist, marginTop: 18, maxWidth: 950 }}>
              <RevealText text={project.subtitle} startFrame={55} stagger={1} wordStyle={{ marginRight: '0.28em' }} />
            </p>
          )}

          <div style={{ marginTop: 40, opacity: tagProgress, transform: `translateY(${(1 - tagProgress) * 12}px)` }}>
            <GoldRule width={54} style={{ marginBottom: 14 }} />
            <span style={{ fontFamily: FONT_SANS, fontSize: 19, letterSpacing: 3, color: COLORS.dust }}>
              On display at najdawi-dot.github.io/digital-museum
            </span>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      <FilmGrain />
      <Letterbox />
    </AbsoluteFill>
  );
}
