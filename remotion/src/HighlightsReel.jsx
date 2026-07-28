import React from 'react';
import { AbsoluteFill, Audio, staticFile, interpolate, Easing } from 'remotion';
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
const PRESENTATIONS = {
  dissolve: () => fade(),
  slideUp: () => slide({ direction: 'from-bottom' }),
  wipe: () => wipe({ direction: 'from-right' }),
  crossZoom: () => crossZoom({ strength: 0.45 }),
};

// Spring configs, used when the cut is not locked to the music. Spring timing
// eases in and out like a real edit rather than holding constant velocity —
// the single most noticeable "default template" tell in the original cut.
const SPRING_CONFIGS = {
  dissolve: { damping: 200, stiffness: 90 },
  slideUp: { damping: 26, mass: 0.6 },
  wipe: { damping: 22, mass: 0.7 },
};

/** Timing for one transition.
 *
 * When the EDL is beat-locked, the snapping placed each transition so that
 * its MIDPOINT — the frame a viewer actually perceives the change on — lands
 * on a bar line. That reasoning only holds for a timing function whose
 * progress is linear in time. A spring is not half-way through at half its
 * duration, so a spring dissolve would perceptibly change somewhere other
 * than where the grid says, and the alignment would be a claim rather than a
 * fact. Eased linear timing keeps the shape without moving the midpoint.
 *
 * crossZoom is always linear: its own strength curve already reads as eased. */
function timingFor(type, frames, beatLocked) {
  if (type === 'crossZoom' || beatLocked) {
    return linearTiming({ durationInFrames: frames, easing: Easing.inOut(Easing.cubic) });
  }
  return springTiming({ config: SPRING_CONFIGS[type] ?? SPRING_CONFIGS.dissolve, durationInFrames: frames });
}

/** A missing/unknown transition is a hard cut: TransitionSeries renders two
 * adjacent Sequences with nothing between them as exactly that. */
function transitionElement(spec, key, beatLocked) {
  if (!spec) return null;
  const presentation = PRESENTATIONS[spec.type];
  if (!presentation) return null;
  return (
    <TransitionSeries.Transition
      key={key}
      presentation={presentation()}
      timing={timingFor(spec.type, spec.durationInFrames, beatLocked)}
    />
  );
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
          transitionElement(section.transitionIn, `t${i}`, EDL.mode === 'beat-locked'),
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
