import {
  INITIAL_PROJECTS,
  SITE_SETTINGS,
  INITIAL_TIMELINE,
  INITIAL_TESTIMONIALS,
  INITIAL_VOLUNTEERING,
} from '../../src/data/projects.js';
import liveStats from './live-stats.json';

const projects = INITIAL_PROJECTS || [];
const timeline = INITIAL_TIMELINE || [];
const testimonials = INITIAL_TESTIMONIALS || [];
const volunteering = INITIAL_VOLUNTEERING || [];

// Newest first, by year then by array position (the collection is already
// authored newest-first, same order the site's gallery renders).
const featured = projects.find(p => p.featured) || projects[0] || null;
const showcaseProjects = [
  featured,
  ...projects.filter(p => p !== featured),
].filter(Boolean).slice(0, 5);

const categories = [...new Set(projects.map(p => p.category).filter(Boolean))];

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
  guestbookCount: liveStats.guestbookCount || 0,
  guestbookNames: liveStats.guestbookNames || [],
  guestbookQuotes: liveStats.guestbookQuotes || [],
  totalLikes: liveStats.totalLikes || 0,
  cvLink: SITE_SETTINGS?.cvLink,
  socialGithub: SITE_SETTINGS?.social?.github,
};
