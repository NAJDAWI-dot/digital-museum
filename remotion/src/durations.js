// Section and transition durations, in frames @ 30fps — kept in their own
// module (rather than HighlightsReel.jsx) so slides can read their own
// section length for full-duration effects like SlideDrift without
// importing the composition that imports them back.
export const FADE_FRAMES = 20;
export const SLIDE_FRAMES = 20;
export const WIPE_FRAMES = 24;
export const CROSSZOOM_FRAMES = 26;

export const TITLE_FRAMES = 90;
export const STATS_FRAMES = 120;
export const TIMELINE_FRAMES = 120;
export const VOLUNTEERING_FRAMES = 105;
export const TESTIMONIAL_FRAMES = 120;
export const GUESTBOOK_FRAMES = 150;
export const END_CARD_FRAMES = 120;
