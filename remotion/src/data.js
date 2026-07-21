import {
  INITIAL_PROJECTS,
  SITE_SETTINGS,
  INITIAL_TIMELINE,
  INITIAL_TESTIMONIALS,
  INITIAL_VOLUNTEERING,
} from '../../src/data/projects.js';
import liveStats from './live-stats.json';
import reelConfig from '../reel-config.json';
import renderSettings from '../render-settings.json';

const projects = INITIAL_PROJECTS || [];
const timeline = INITIAL_TIMELINE || [];
const testimonials = INITIAL_TESTIMONIALS || [];
const volunteering = INITIAL_VOLUNTEERING || [];

// The reel director (admin app, via reel-config.json) can pick which
// projects star in the montage and in what order; otherwise featured-first,
// newest-first (the collection is already authored newest-first, same order
// the site's gallery renders).
const starIds = Array.isArray(reelConfig.starProjects) && reelConfig.starProjects.length > 0
  ? reelConfig.starProjects
  : null;
const featured = projects.find(p => p.featured) || projects[0] || null;
// null/0/blank = show every real project (accurate to the actual
// collection, whatever its size) — a positive number caps it explicitly,
// e.g. for a large collection where director wants a shorter reel.
const maxShowcase = renderSettings.maxShowcaseProjects;
const showcaseProjectsFull = starIds
  ? starIds.map(id => projects.find(p => p.id === id)).filter(Boolean)
  : [featured, ...projects.filter(p => p !== featured)].filter(Boolean);
const showcaseProjects = maxShowcase ? showcaseProjectsFull.slice(0, maxShowcase) : showcaseProjectsFull;

// Section toggles — a director switching a section off must not distort the
// stats slide's real numbers, so these are separate show* flags rather than
// zeroed counts.
const sections = reelConfig.sections || {};

const categories = [...new Set(projects.map(p => p.category).filter(Boolean))];

// How many photos (cover + screenshots) the gallery corridor shows per
// project — controllable from the local render control station's
// render-settings.json; clamped here as a last line of defense in case
// that file is hand-edited with an out-of-range value.
const photosPerProject = Math.max(1, Math.min(4, renderSettings.photosPerProject ?? 3));

const latestVolunteering = volunteering[0] || null;
const latestTimeline = timeline[0] || null;
const featuredTestimonial = testimonials.find(t => t.quote) || null;

// All photos across every volunteering entry, flattened for the collage —
// this is what makes the slide "add up" as more entries are added, rather
// than only ever showing the latest one.
const volunteeringPhotos = volunteering.flatMap(entry =>
  (entry.photos || []).map(src => ({ src, entryTitle: entry.title }))
);
const volunteeringOrgs = [...new Set(volunteering.map(v => v.organization).filter(Boolean))];

export const reelData = {
  siteName: 'The Najdawi Collection',
  ownerName: 'Hashem Najdawi',
  projects,
  showcaseProjects,
  photosPerProject,
  projectCount: projects.length,
  categories,
  categoryCount: categories.length,
  timeline,
  timelineCount: timeline.length,
  latestTimeline,
  volunteering,
  volunteeringCount: volunteering.length,
  latestVolunteering,
  volunteeringPhotos,
  volunteeringOrgCount: volunteeringOrgs.length,
  testimonials,
  featuredTestimonial,
  showTimeline: sections.timeline !== false && timeline.length > 0,
  showVolunteering: sections.volunteering !== false && volunteering.length > 0,
  showTestimonial: sections.testimonial !== false && Boolean(featuredTestimonial),
  guestbookCount: liveStats.guestbookCount || 0,
  guestbookNames: liveStats.guestbookNames || [],
  guestbookQuotes: liveStats.guestbookQuotes || [],
  totalLikes: liveStats.totalLikes || 0,
  cvLink: SITE_SETTINGS?.cvLink,
  socialGithub: SITE_SETTINGS?.social?.github,
};
