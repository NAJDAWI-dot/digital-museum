# Highlights Reel

Auto-generated cinematic recap of the whole museum — projects, career milestones, volunteering,
testimonials, and guestbook activity — rendered offline as a real `.mp4` with [Remotion](https://remotion.dev).

## Why offline rendering, not a live in-browser experience

A live/interactive version (like the per-project Exhibit Reel on the site) is always automatically
current since it reads live data at play-time, but its quality ceiling is bounded by whatever the
visitor's device can render in real time. Rendering offline, frame-by-frame, removes that ceiling —
arbitrary per-frame effect budget, identical playback on every device, real fonts loaded properly —
at the cost of needing an actual render step instead of being current by construction. See
`.github/workflows/render-highlights.yml` for how that render step stays automatic.

## How it regenerates automatically

1. The live editor (or you, locally) commits a change to `src/data/projects.js`.
2. That push triggers `.github/workflows/render-highlights.yml` (path-filtered to that file).
3. The workflow extracts any freshly-added base64 images to real files (same script the main
   deploy workflow uses), fetches live guestbook/appreciation stats from Supabase + CounterAPI
   (`scripts/fetch-live-stats.mjs`), renders the reel, and commits the new `public/highlights.mp4`.
4. That commit isn't `[skip ci]`, so it triggers the normal `deploy.yml` — the new video ships to
   GitHub Pages on the very next deploy.

No manual regeneration step, ever — add a project, the reel catches up on its own.

## Local development

```
npm install
npm run dev            # opens Remotion Studio — live preview, scrub the timeline
npm run fetch-stats     # refresh src/live-stats.json with real guestbook/likes data (needs
                         # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in your environment)
npm run render          # render out/highlights.mp4
```

`remotion.config.js` points Remotion's public directory at the site's own `public/` folder, so
project images already extracted there are used directly — nothing is duplicated.

## Structure

- `src/data.js` — pulls from `../src/data/projects.js` (the site's own content file) plus
  `live-stats.json`, and derives everything the slides need (showcase project list, category
  count, latest volunteering entry, etc.)
- `src/HighlightsReel.jsx` — the composition: assembles slides via `@remotion/transitions`
  `TransitionSeries` with crossfades between sections, and skips any slide whose data doesn't
  exist yet (no volunteering entries → no volunteering slide)
- `src/slides/` — one component per section
- `src/components/` — reusable animation primitives (`CountUp`, `KenBurnsImage`, `RevealText`,
  `Letterbox`, `Scrim`, `GoldRule`)
- `src/fonts.js` — loads Cormorant Garamond + DM Sans via `@remotion/google-fonts`, matching the
  site's own typography exactly
