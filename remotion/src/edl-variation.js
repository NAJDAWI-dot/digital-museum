// Makes each render a different edit of the same material.
//
// The reel regenerates every Tuesday, but the cut was identical every time:
// same section order, same section lengths, same transition at every
// boundary. Only the music and the project data moved, so a weekly reel read
// as a re-run rather than a new edit.
//
// Everything here is driven by a seed recorded in the EDL, so "that week's
// cut looked wrong" is a reproducible statement rather than a lost one.
//
// Deliberately NOT here: hard cuts between sections. A hard cut from a title
// card to a 3D corridor reads as a rendering fault, not an edit — cutting
// works between shots that share a world, which is the montage's job
// (and needs the beat grid to land on). Between heterogeneous sections the
// variety worth having is *which* soft transition and *how long* it holds.
import { TRANSITIONS } from './reel-timing.js';
import { createRng } from './rng.js';

/** Sections whose length can flex without breaking their own choreography.
 *
 * Title, montage and endCard are excluded on purpose. Title and endCard run
 * fixed internal timings (the count settling, the sink to black), and the
 * montage's length is a function of its shot count, not a free parameter. */
const FLEXIBLE_SECTIONS = new Set(['stats', 'timeline', 'volunteering', 'testimonial', 'guestbook']);

/** How far a flexible section may stretch or compress.
 *
 * The ceiling is set by each slide's own choreography: compressing a section
 * past the point where its last animation settles would cut content off
 * mid-move. Guestbook is the tightest — its featured quote starts at frame
 * 144 and settles by ~204, against a floor of 264 frames at this jitter.
 * Every other flexible slide has more room. Raising this materially means
 * re-checking those offsets. */
const DURATION_JITTER = 0.12;

/** Which transitions suit arriving at which section. crossZoom has real
 * force to it, so it goes where the reel steps up rather than everywhere;
 * slideUp suits a section that introduces a new kind of thing. */
const TRANSITION_PALETTE = {
  montage: ['dissolve', 'crossZoom'],
  stats: ['crossZoom', 'dissolve'],
  timeline: ['dissolve', 'slideUp'],
  volunteering: ['slideUp', 'dissolve', 'wipe'],
  testimonial: ['dissolve', 'slideUp'],
  guestbook: ['wipe', 'dissolve', 'slideUp'],
  endCard: ['dissolve', 'crossZoom'],
};

/** The optional middle sections, in the order they may be permuted. These
 * three are peers — career, service, and what other people said — so their
 * order is a pacing choice rather than a narrative one. The fixed spine
 * (title, montage, stats ... endCard) never moves. */
const PERMUTABLE = ['timeline', 'volunteering', 'testimonial'];

/** Applies variation to a section list in place of the fixed defaults.
 * Returns a new list; the input is not modified. */
export function varySections(sections, { seed, transitionFramesFor }) {
  const rng = createRng(seed);
  const result = reorderOptionalSections(sections, rng);

  let previousType = null;
  return result.map((section, index) => {
    const varied = { ...section };

    if (FLEXIBLE_SECTIONS.has(section.id)) {
      const factor = 1 + rng.range(-DURATION_JITTER, DURATION_JITTER);
      varied.frames = Math.round(section.frames * factor);
    }

    // The first section is never transitioned into.
    if (index === 0) {
      varied.transitionIn = null;
      return varied;
    }

    const palette = TRANSITION_PALETTE[section.id] ?? ['dissolve'];
    // Avoid using the same transition twice running: repetition is exactly
    // what made the fixed cut feel mechanical.
    const type = rng.pickAvoiding(palette, previousType) ?? 'dissolve';
    previousType = type;

    const base = TRANSITIONS[type] ?? TRANSITIONS.dissolve;
    varied.transitionIn = {
      type: base.type,
      durationInFrames: transitionFramesFor
        ? transitionFramesFor(base, rng)
        : base.durationInFrames,
    };
    return varied;
  });
}

/** Permutes the optional middle block, leaving the spine alone. */
function reorderOptionalSections(sections, rng) {
  const present = sections.filter((s) => PERMUTABLE.includes(s.id));
  if (present.length < 2) return sections.slice();

  const order = rng.shuffle(present);
  let cursor = 0;
  return sections.map((section) =>
    PERMUTABLE.includes(section.id) ? order[cursor++] : section,
  );
}

/** Recomputes start frames after lengths or order have changed. Mirrors
 * TransitionSeries' overlap accounting, same as buildSectionList. */
export function restack(sections) {
  let cursor = 0;
  return sections.map((section) => {
    const tin = section.transitionIn ? section.transitionIn.durationInFrames : 0;
    cursor -= tin;
    const placed = { ...section, startFrame: cursor };
    cursor += section.frames;
    return placed;
  });
}

/** A transition's length, varied a little around its default. Clamped so it
 * can never exceed either neighbouring section — TransitionSeries throws on
 * that, and verify-edl checks it, but it should never get that far. */
export function variedTransitionFrames(base, rng, { min = 10, max = 26 } = {}) {
  const jittered = Math.round(base.durationInFrames * (1 + rng.range(-0.25, 0.25)));
  return Math.max(min, Math.min(max, jittered));
}
