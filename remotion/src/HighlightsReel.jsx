import React from 'react';
import { AbsoluteFill, Audio, staticFile, interpolate } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { crossZoom } from '@remotion/transitions';
import { COLORS } from './theme.js';
import { useFormat } from './format.jsx';
import Letterbox from './components/Letterbox.jsx';
import FilmGrain from './components/FilmGrain.jsx';
import TitleSlide from './slides/TitleSlide.jsx';
import ProjectsMontage from './slides/ProjectsMontage.jsx';
import StatsSlide from './slides/StatsSlide.jsx';
import TimelineMontage from './slides/TimelineMontage.jsx';
import VolunteeringSlide from './slides/VolunteeringSlide.jsx';
import TestimonialSlide from './slides/TestimonialSlide.jsx';
import GuestbookSlide from './slides/GuestbookSlide.jsx';
import EndCard from './slides/EndCard.jsx';

import { EDL } from './edl.js';

// What each transition symbol in the EDL actually looks like. The EDL names a
// type and a length; everything about the appearance lives here, so a
// transition can be retuned without regenerating a single EDL.
//
// Spring-based timing (rather than linear) so every cut eases in/out like a
// real edit instead of holding constant velocity for its whole duration —
// the single most noticeable "default template" tell in the previous cut.
// crossZoom is left on linearTiming since its own strength curve already
// reads as an eased transition on its own.
const TRANSITION_PRESENTATIONS = {
  dissolve: (frames) => (
    <TransitionSeries.Transition
      presentation={fade()}
      timing={springTiming({ config: { damping: 200, stiffness: 90 }, durationInFrames: frames })}
    />
  ),
  slideUp: (frames) => (
    <TransitionSeries.Transition
      presentation={slide({ direction: 'from-bottom' })}
      timing={springTiming({ config: { damping: 26, mass: 0.6 }, durationInFrames: frames })}
    />
  ),
  wipe: (frames) => (
    <TransitionSeries.Transition
      presentation={wipe({ direction: 'from-right' })}
      timing={springTiming({ config: { damping: 22, mass: 0.7 }, durationInFrames: frames })}
    />
  ),
  crossZoom: (frames) => (
    <TransitionSeries.Transition
      presentation={crossZoom({ strength: 0.45 })}
      timing={linearTiming({ durationInFrames: frames })}
    />
  ),
};

/** A missing/unknown transition is a hard cut: TransitionSeries renders two
 * adjacent Sequences with nothing between them as exactly that. */
function transitionElement(spec, key) {
  if (!spec) return null;
  const make = TRANSITION_PRESENTATIONS[spec.type];
  if (!make) return null;
  return React.cloneElement(make(spec.durationInFrames), { key });
}

/** Which component renders each section, and what it needs from the data.
 * Adding a section to the EDL without adding it here renders nothing rather
 * than crashing — a missing slide is recoverable, a thrown render is not. */
const SECTION_COMPONENTS = {
  TitleSlide: (data) => <TitleSlide siteName={data.siteName} projectCount={data.projectCount} />,
  ProjectsMontage: (data) => (
    <ProjectsMontage projects={data.showcaseProjects} photosPerProject={data.photosPerProject} />
  ),
  StatsSlide: (data) => (
    <StatsSlide
      projectCount={data.projectCount}
      categoryCount={data.categoryCount}
      timelineCount={data.timelineCount}
    />
  ),
  TimelineMontage: (data) => <TimelineMontage timeline={data.timeline} />,
  VolunteeringSlide: (data) => (
    <VolunteeringSlide
      photos={data.volunteeringPhotos}
      count={data.volunteeringCount}
      orgCount={data.volunteeringOrgCount}
    />
  ),
  TestimonialSlide: (data) => <TestimonialSlide testimonial={data.featuredTestimonial} />,
  GuestbookSlide: (data) => (
    <GuestbookSlide count={data.guestbookCount} names={data.guestbookNames} quote={data.guestbookQuotes[0]} />
  ),
  EndCard: (data) => <EndCard ownerName={data.ownerName} totalLikes={data.totalLikes} />,
};

/** Fades the score in/out against the ACTUAL video length (which varies
 * with content), with a slow breathing tremolo throughout — done here
 * rather than baked into the audio file, since only the composition knows
 * its own duration. */
function scoreVolume(frame, totalFrames) {
  const attack = interpolate(frame, [0, 90], [0, 1], { extrapolateRight: 'clamp' });
  const release = interpolate(frame, [totalFrames - 110, totalFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tremolo = 0.92 + 0.08 * Math.sin(frame / 140);
  return Math.min(attack, release) * tremolo;
}

export default function HighlightsReel({ data }) {
  const format = useFormat();

  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <Audio src={staticFile('audio/theme.mp3')} volume={(f) => scoreVolume(f, EDL.totalFrames)} />

      {/* The cut comes from the EDL, not from this file. flattenChildren
          drops the nulls, so a section with no transitionIn is a hard cut. */}
      <TransitionSeries>
        {EDL.sections.flatMap((section, i) => [
          transitionElement(section.transitionIn, `t${i}`),
          <TransitionSeries.Sequence key={`s${i}`} durationInFrames={section.durationInFrames}>
            {SECTION_COMPONENTS[section.component]?.(data) ?? null}
          </TransitionSeries.Sequence>,
        ])}
      </TransitionSeries>

      <FilmGrain />
      {/* Cinema bars read as intentional on 16:9; on a 9:16 phone-first cut
          they just eat vertical space, so the vertical format skips them. */}
      {format !== 'vertical' && <Letterbox />}
    </AbsoluteFill>
  );
}
