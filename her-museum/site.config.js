// ─────────────────────────────────────────────────────────────────────────
//  SITE CONFIG — the one file to edit before the first deploy.
//
//  Everything that identifies the owner lives here: her name, the GitHub
//  repository the site is published from, and the link where it ends up.
//  vite.config.js, index.html, the 404 page, robots.txt, sitemap.xml and
//  the app itself all read from this file, so nothing else needs a find-
//  and-replace.
//
//  Content (projects, timeline, volunteering, contact email, social links)
//  is NOT here — that is edited live from the site's own Editor and stored
//  in src/data/projects.js.
// ─────────────────────────────────────────────────────────────────────────

export const SITE = {
  // Full name, exactly as it should appear in the navbar, preloader & footer.
  ownerName: 'Your Name',

  // Two letters for the favicon monogram.
  initials: 'YN',

  // One line used for search results and link previews.
  tagline: 'A curated collection of projects, creative work, and milestones.',

  // GitHub account + repository the site is deployed from. The live Editor
  // commits content changes straight into this repo, and GitHub Pages serves
  // the site at https://<githubOwner>.github.io/<githubRepo>/.
  githubOwner: 'your-github-username',
  githubRepo: 'her-museum',

  // Gallery filter tabs & the Editor's category dropdown. Rename freely —
  // only categories with at least one project show up as tabs.
  categories: ['Design', 'Art', 'Photography', 'Writing', 'Engineering', 'Web', 'Research'],

  // Status badges a project can carry.
  statuses: ['Featured', 'Completed', 'In Progress', 'Published', 'Exhibited', 'Live'],

  // Namespace for the ♡ "appreciate" counters on each project card
  // (stored at counterapi.dev — free, no account needed). Must be unique to
  // this site so the hearts don't mix with anyone else's.
  likesNamespace: 'her-museum-change-me',

  // Year the collection was founded — shown in the hero eyebrow.
  established: '2024',
};

// GitHub Pages serves a project repo under /<repo>/. If the site is deployed
// as a user site (repo named <username>.github.io) or on a custom domain,
// change this to '/'.
export const BASE_PATH = `/${SITE.githubRepo}/`;

export const SITE_URL = `https://${SITE.githubOwner.toLowerCase()}.github.io${BASE_PATH}`;
