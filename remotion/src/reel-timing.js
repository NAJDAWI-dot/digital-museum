// The reel's timing model, in plain JS — no JSX, no Remotion imports — so
// Node scripts can import it directly instead of hand-copying the numbers.
//
// This exists because they used to copy them. select-score.mjs sized the
// music with a hardcoded "comfortably longer than any realistic reel"
// guess, and agent-review.mjs kept its own duplicate of every duration
// constant plus a re-implementation of the shot-list math, with a comment
// admitting the copies had to be kept in sync by hand. A wrong copy is
// silent: the reel just ends up longer than its soundtrack, or the QA agent
// samples frames from the wrong slides.
//
// Everything here is a pure function of the reel data, so the composition
// and the scripts around it can never disagree about how long anything is.
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

/** One photo's dwell time in the corridor. Per-shot, not per-project — a
 * project can contribute several photos (see buildProjectShotList). */
export const PROJECTS_MONTAGE_SHOT_FRAMES = 210; // 3.5s @ 60fps

/** Flattens projects into a flat shot list — cover photo first, then up to
 * (photosPerProject - 1) screenshots — so the corridor can dolly through
 * every photo at an equal dwell time instead of one cover shot per project.
 * photosPerProject=1 reproduces the original one-shot-per-project behavior. */
export function buildProjectShotList(projects, photosPerProject = 3) {
  const cap = Math.max(1, Math.min(4, photosPerProject));
  const shots = [];
  (projects || []).forEach((project, projectIndex) => {
    const extras = (project.screenshots || []).slice(0, cap - 1);
    const srcs = [project.coverImage, ...extras].filter(Boolean).slice(0, cap);
    srcs.forEach((src, shotIndexInProject) => {
      shots.push({ src, project, projectIndex, shotIndexInProject, shotsInProject: srcs.length });
    });
  });
  return shots;
}

/** The transition vocabulary. These are symbols, not presentations: the
 * composition owns what each one actually looks like, so a transition can be
 * retuned (or beat-locked) without regenerating anything downstream. `null`
 * means a hard cut — TransitionSeries renders two adjacent Sequences with no
 * Transition between them as exactly that, so a cut costs nothing. */
export const TRANSITIONS = {
  dissolve: { type: 'dissolve', durationInFrames: FADE_FRAMES },
  slideUp: { type: 'slideUp', durationInFrames: SLIDE_FRAMES },
  wipe: { type: 'wipe', durationInFrames: WIPE_FRAMES },
  crossZoom: { type: 'crossZoom', durationInFrames: CROSSZOOM_FRAMES },
};

/** The ordered section list for a dataset, each entry carrying the transition
 * that plays *into* it and its absolute start frame.
 *
 * startFrame follows TransitionSeries' own accounting: a transition overlaps
 * the two sequences it sits between, so each section starts at
 * (sum of prior durations) - (sum of prior transitions). Optional sections
 * drop out entirely when there's no content to fill them — an empty
 * collection shouldn't pad out a blank slide. Guestbook and EndCard keep
 * fixed transitions regardless of which optional sections precede them. */
export function buildSectionList(data) {
  const shots = buildProjectShotList(data.showcaseProjects, data.photosPerProject);

  const sections = [
    { id: 'title', component: 'TitleSlide', frames: TITLE_FRAMES, transitionIn: null },
    { id: 'montage', component: 'ProjectsMontage', frames: shots.length * PROJECTS_MONTAGE_SHOT_FRAMES, transitionIn: TRANSITIONS.dissolve },
    { id: 'stats', component: 'StatsSlide', frames: STATS_FRAMES, transitionIn: TRANSITIONS.crossZoom },
  ];
  if (data.showTimeline) sections.push({ id: 'timeline', component: 'TimelineMontage', frames: TIMELINE_FRAMES, transitionIn: TRANSITIONS.dissolve });
  if (data.showVolunteering) sections.push({ id: 'volunteering', component: 'VolunteeringSlide', frames: VOLUNTEERING_FRAMES, transitionIn: TRANSITIONS.slideUp });
  if (data.showTestimonial) sections.push({ id: 'testimonial', component: 'TestimonialSlide', frames: TESTIMONIAL_FRAMES, transitionIn: TRANSITIONS.dissolve });
  sections.push({ id: 'guestbook', component: 'GuestbookSlide', frames: GUESTBOOK_FRAMES, transitionIn: TRANSITIONS.wipe });
  sections.push({ id: 'endCard', component: 'EndCard', frames: END_CARD_FRAMES, transitionIn: TRANSITIONS.dissolve });

  let cursor = 0;
  for (const section of sections) {
    cursor -= transitionFrames(section.transitionIn);
    section.startFrame = cursor;
    cursor += section.frames;
  }
  return sections;
}

/** A hard cut (null) contributes no overlap. */
export function transitionFrames(transition) {
  return transition ? transition.durationInFrames : 0;
}

/** Total duration for a dataset — used by Root.jsx to size the Composition
 * before render, since frame count depends on how much content exists. */
export function calculateTotalFrames(data) {
  return buildSectionList(data).reduce(
    (total, s) => total + s.frames - transitionFrames(s.transitionIn),
    0,
  );
}

/** Wall-clock length of the reel, for sizing the score against it. */
export function calculateTotalSeconds(data, fps) {
  return calculateTotalFrames(data) / fps;
}
