// Section and transition durations, in frames @ 60fps (2x their original
// 30fps values, preserving identical wall-clock timing) — kept in their own
// module (rather than HighlightsReel.jsx) so slides can read their own
// section length for full-duration effects like SlideDrift without
// importing the composition that imports them back.
export const FADE_FRAMES = 40;
export const SLIDE_FRAMES = 40;
export const WIPE_FRAMES = 48;
export const CROSSZOOM_FRAMES = 52;

export const TITLE_FRAMES = 180;
export const STATS_FRAMES = 240;
export const TIMELINE_FRAMES = 240;
export const VOLUNTEERING_FRAMES = 210;
export const TESTIMONIAL_FRAMES = 240;
export const GUESTBOOK_FRAMES = 300;
export const END_CARD_FRAMES = 240;
