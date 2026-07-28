// Section and transition durations, in frames @ 60fps (2x their original
// 30fps values, preserving identical wall-clock timing) — kept in their own
// module (rather than HighlightsReel.jsx) so slides can read their own
// section length for full-duration effects like SlideDrift without
// importing the composition that imports them back.
// Transitions. Previously 40-52 frames — 0.67s to 0.87s each, on every
// single boundary in the reel, with no hard cuts anywhere. At that length a
// transition stops reading as an edit and starts reading as the piece
// dissolving into itself, which is most of why the cut felt like a template
// rather than something someone assembled. Shortened to roughly a third of
// a second: still soft enough to carry between unrelated sections, short
// enough to land as a decision.
export const FADE_FRAMES = 16;
export const SLIDE_FRAMES = 18;
export const WIPE_FRAMES = 20;
export const CROSSZOOM_FRAMES = 20;

export const TITLE_FRAMES = 180;
export const STATS_FRAMES = 240;
export const TIMELINE_FRAMES = 240;
export const VOLUNTEERING_FRAMES = 210;
export const TESTIMONIAL_FRAMES = 240;
export const GUESTBOOK_FRAMES = 300;
export const END_CARD_FRAMES = 240;
