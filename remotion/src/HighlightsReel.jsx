import React from 'react';
import { AbsoluteFill, Audio, staticFile, interpolate } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { crossZoom } from '@remotion/transitions';
import { COLORS } from './theme.js';
import Letterbox from './components/Letterbox.jsx';
import TitleSlide from './slides/TitleSlide.jsx';
import ProjectsMontage, { PROJECTS_MONTAGE_FRAMES_PER_ITEM } from './slides/ProjectsMontage.jsx';
import StatsSlide from './slides/StatsSlide.jsx';
import TimelineMontage from './slides/TimelineMontage.jsx';
import VolunteeringSlide from './slides/VolunteeringSlide.jsx';
import TestimonialSlide from './slides/TestimonialSlide.jsx';
import GuestbookSlide from './slides/GuestbookSlide.jsx';
import EndCard from './slides/EndCard.jsx';

const TRANSITION_FRAMES = 20;

export const TITLE_FRAMES = 90;
export const STATS_FRAMES = 120;
export const TIMELINE_FRAMES = 120;
export const VOLUNTEERING_FRAMES = 105;
export const TESTIMONIAL_FRAMES = 120;
export const GUESTBOOK_FRAMES = 150;
export const END_CARD_FRAMES = 120;

/** Total duration for a given dataset — used by Root.jsx to size the
 * Composition before render, since frame count depends on how much content
 * actually exists (a fresh collection with no volunteering entries yet
 * shouldn't pad out an empty slide). */
export function calculateTotalFrames(data) {
  const sections = [TITLE_FRAMES, data.showcaseProjects.length * PROJECTS_MONTAGE_FRAMES_PER_ITEM, STATS_FRAMES];
  if (data.timelineCount > 0) sections.push(TIMELINE_FRAMES);
  if (data.volunteeringCount > 0) sections.push(VOLUNTEERING_FRAMES);
  if (data.featuredTestimonial) sections.push(TESTIMONIAL_FRAMES);
  sections.push(GUESTBOOK_FRAMES, END_CARD_FRAMES);
  const contentFrames = sections.reduce((a, b) => a + b, 0);
  return contentFrames - (sections.length - 1) * TRANSITION_FRAMES;
}

// A soft, non-repeating tone as fewer than 4 hard cuts. Reserving the
// dramatic wipe for the transition into the closing stretch (guestbook)
// makes it read as a deliberate accent, not noise.
const T_FADE = <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })} />;
const T_SLIDE_UP = <TransitionSeries.Transition presentation={slide({ direction: 'from-bottom' })} timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })} />;
const T_WIPE = <TransitionSeries.Transition presentation={wipe({ direction: 'from-right' })} timing={linearTiming({ durationInFrames: 24 })} />;
const T_CROSSZOOM = <TransitionSeries.Transition presentation={crossZoom({ strength: 0.45 })} timing={linearTiming({ durationInFrames: 26 })} />;

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

      <Letterbox />
    </AbsoluteFill>
  );
}
