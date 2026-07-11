import React from 'react';
import { AbsoluteFill, Audio, staticFile, interpolate } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { crossZoom } from '@remotion/transitions';
import { COLORS } from './theme.js';
import Letterbox from './components/Letterbox.jsx';
import FilmGrain from './components/FilmGrain.jsx';
import TitleSlide from './slides/TitleSlide.jsx';
import ProjectsMontage, { PROJECTS_MONTAGE_FRAMES_PER_ITEM } from './slides/ProjectsMontage.jsx';
import StatsSlide from './slides/StatsSlide.jsx';
import TimelineMontage from './slides/TimelineMontage.jsx';
import VolunteeringSlide from './slides/VolunteeringSlide.jsx';
import TestimonialSlide from './slides/TestimonialSlide.jsx';
import GuestbookSlide from './slides/GuestbookSlide.jsx';
import EndCard from './slides/EndCard.jsx';

import {
  FADE_FRAMES,
  SLIDE_FRAMES,
  WIPE_FRAMES,
  CROSSZOOM_FRAMES,
  TITLE_FRAMES,
  STATS_FRAMES,
  TIMELINE_FRAMES,
  VOLUNTEERING_FRAMES,
  TESTIMONIAL_FRAMES,
  GUESTBOOK_FRAMES,
  END_CARD_FRAMES,
} from './durations.js';

/** Total duration for a given dataset — used by Root.jsx to size the
 * Composition before render, since frame count depends on how much content
 * actually exists (a fresh collection with no volunteering entries yet
 * shouldn't pad out an empty slide). Each section lists the duration of the
 * transition that plays right *before* it, mirroring the JSX below exactly
 * — Guestbook and EndCard always use the same transition regardless of
 * which optional sections precede them, so those two stay fixed even as
 * sections are added/removed above them. */
export function calculateTotalFrames(data) {
  const sections = [{ frames: TITLE_FRAMES }];
  sections.push({ frames: data.showcaseProjects.length * PROJECTS_MONTAGE_FRAMES_PER_ITEM, transitionIn: FADE_FRAMES });
  sections.push({ frames: STATS_FRAMES, transitionIn: CROSSZOOM_FRAMES });
  if (data.timelineCount > 0) sections.push({ frames: TIMELINE_FRAMES, transitionIn: FADE_FRAMES });
  if (data.volunteeringCount > 0) sections.push({ frames: VOLUNTEERING_FRAMES, transitionIn: SLIDE_FRAMES });
  if (data.featuredTestimonial) sections.push({ frames: TESTIMONIAL_FRAMES, transitionIn: FADE_FRAMES });
  sections.push({ frames: GUESTBOOK_FRAMES, transitionIn: WIPE_FRAMES });
  sections.push({ frames: END_CARD_FRAMES, transitionIn: FADE_FRAMES });

  return sections.reduce((total, s) => total + s.frames - (s.transitionIn ?? 0), 0);
}

// Spring-based timing (rather than linear) so every cut eases in/out like a
// real edit instead of holding constant velocity for its whole duration —
// the single most noticeable "default template" tell in the previous cut.
// crossZoom is left on linearTiming since its own strength curve already
// reads as an eased transition on its own.
const T_FADE = <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200, stiffness: 90 }, durationInFrames: FADE_FRAMES })} />;
const T_SLIDE_UP = <TransitionSeries.Transition presentation={slide({ direction: 'from-bottom' })} timing={springTiming({ config: { damping: 26, mass: 0.6 }, durationInFrames: SLIDE_FRAMES })} />;
const T_WIPE = <TransitionSeries.Transition presentation={wipe({ direction: 'from-right' })} timing={springTiming({ config: { damping: 22, mass: 0.7 }, durationInFrames: WIPE_FRAMES })} />;
const T_CROSSZOOM = <TransitionSeries.Transition presentation={crossZoom({ strength: 0.45 })} timing={linearTiming({ durationInFrames: CROSSZOOM_FRAMES })} />;

/** Fades the score in/out against the ACTUAL video length (which varies
 * with content), with a slow breathing tremolo throughout — done here
 * rather than baked into the audio file, since only the composition knows
 * its own duration. */
function scoreVolume(frame, totalFrames) {
  const attack = interpolate(frame, [0, 45], [0, 1], { extrapolateRight: 'clamp' });
  const release = interpolate(frame, [totalFrames - 55, totalFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tremolo = 0.92 + 0.08 * Math.sin(frame / 70);
  return Math.min(attack, release) * tremolo;
}

export default function HighlightsReel({ data }) {
  const totalFrames = calculateTotalFrames(data);

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <Audio src={staticFile('audio/theme.mp3')} volume={(f) => scoreVolume(f, totalFrames)} />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={TITLE_FRAMES}>
          <TitleSlide siteName={data.siteName} projectCount={data.projectCount} />
        </TransitionSeries.Sequence>

        {T_FADE}

        <TransitionSeries.Sequence durationInFrames={data.showcaseProjects.length * PROJECTS_MONTAGE_FRAMES_PER_ITEM}>
          <ProjectsMontage projects={data.showcaseProjects} />
        </TransitionSeries.Sequence>

        {T_CROSSZOOM}

        <TransitionSeries.Sequence durationInFrames={STATS_FRAMES}>
          <StatsSlide projectCount={data.projectCount} categoryCount={data.categoryCount} timelineCount={data.timelineCount} />
        </TransitionSeries.Sequence>

        {data.timelineCount > 0 && (
          <>
            {T_FADE}
            <TransitionSeries.Sequence durationInFrames={TIMELINE_FRAMES}>
              <TimelineMontage timeline={data.timeline} />
            </TransitionSeries.Sequence>
          </>
        )}

        {data.volunteeringCount > 0 && (
          <>
            {T_SLIDE_UP}
            <TransitionSeries.Sequence durationInFrames={VOLUNTEERING_FRAMES}>
              <VolunteeringSlide
                photos={data.volunteeringPhotos}
                count={data.volunteeringCount}
                orgCount={data.volunteeringOrgCount}
              />
            </TransitionSeries.Sequence>
          </>
        )}

        {data.featuredTestimonial && (
          <>
            {T_FADE}
            <TransitionSeries.Sequence durationInFrames={TESTIMONIAL_FRAMES}>
              <TestimonialSlide testimonial={data.featuredTestimonial} />
            </TransitionSeries.Sequence>
          </>
        )}

        {T_WIPE}

        <TransitionSeries.Sequence durationInFrames={GUESTBOOK_FRAMES}>
          <GuestbookSlide count={data.guestbookCount} names={data.guestbookNames} quote={data.guestbookQuotes[0]} />
        </TransitionSeries.Sequence>

        {T_FADE}

        <TransitionSeries.Sequence durationInFrames={END_CARD_FRAMES}>
          <EndCard ownerName={data.ownerName} totalLikes={data.totalLikes} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <FilmGrain />
      <Letterbox />
    </AbsoluteFill>
  );
}
