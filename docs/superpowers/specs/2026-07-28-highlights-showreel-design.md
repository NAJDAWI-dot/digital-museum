# Highlights Showreel: New Section, Restyled Modal, and Weekly Auto-Publish

## Goal

The highlights reel today is a plain text link ("Watch the highlights") tucked among other Hero CTAs, opening an unstyled overlay modal. It's easy to miss and visually flat next to the rest of the site's craft. Give it a dedicated, visually distinct section, restyle the playback modal to match, disclose that the reel is AI-curated, and let it refresh itself on a schedule instead of requiring a manual regenerate-and-publish cycle every time.

## Current baseline

- `Hero.jsx` renders a `hero-tour-link` button (`t('hero.highlights')`) that sets `reelOpen` state and mounts `<HighlightsReelModal open={reelOpen} onClose={...} />` inline.
- `HighlightsReelModal.jsx` is a plain `AnimatePresence` overlay: dimmed backdrop, unstyled video element, wide/vertical toggle button, close button. Plays `public/highlights.mp4` / `public/highlights-vertical.mp4`, poster `public/highlights-poster.jpg`.
- `.github/workflows/render-highlights.yml` runs only on `workflow_dispatch` — triggered by the admin's "Regenerate Highlights Reel" button (Settings tab) or `gh workflow run`. It renders both cuts + poster on a self-hosted runner, uploads them as workflow artifacts, and **stops** — no auto-publish.
- `remotion/control-station` is a local Express app (same self-hosted machine) where the owner reviews the editing agent's picks (project selection/order, section toggles, music) and QA verdict, watches a preview, and manually hits Publish. `lib/gitPublish.mjs`'s `publish()` does: `git lfs install` → fetch `origin/main` → `git reset --hard origin/main` → copy the three rendered files into `public/` → `git add` → commit → push → dispatch `deploy.yml`. This exists specifically so a human can glance at the agent's creative calls before they go live.

## New section: `Showreel.jsx`

- New component, mounted in `App.jsx` between `<Hero revealed={revealed} />` and `<FeaturedBanner />`.
- Structure follows the existing section pattern (`FeaturedBanner`/`Gallery`): `section-label` eyebrow (`ShimmeringText`), serif heading with an italicized gold word (matches `.hl-title em` treatment already used elsewhere, e.g. "A museum of infinite *creations*").
- Single card: `highlights-poster.jpg` as the media background, gold-ringed circular play button centered on hover/always-visible, title + duration overlay bottom-left/right (mirrors the mockup: `hl-card-media`, `play-btn`, `hl-card-foot`). Hover state: subtle lift (`translateY(-3px)`) + border brightening, consistent with `Shine`/`featured-card`'s existing hover language.
- Disclosure caption directly under the card, mono/uppercase, small, gold: **"AI-curated reel · auto-updated every Tuesday"**.
- Clicking the card sets local `reelOpen` state and opens the (moved-here) `HighlightsReelModal`.
- `Hero.jsx` loses the `hero-tour-link` "highlights" button, its `reelOpen` state, and the inline `<HighlightsReelModal>` mount — that all moves into `Showreel.jsx`. The other Hero CTAs (Enter Exhibition, Guided Tour) are untouched.
- i18n: reuse `hero.highlights` for the CTA/label if still applicable, add new keys for the eyebrow and disclosure caption in `en.json`/`ar.json`.

## Restyled `HighlightsReelModal`

Same mechanic and props (`open`, `onClose`), same state/effects (ESC-to-close, wide/vertical variant reset on open, iOS autoplay retry-via-API) — visual layer only:

- Backdrop: darker overlay + `backdrop-filter: blur(...)`, consistent with the mockup's `rgba(6,6,6,.88)` + blur treatment (new territory for this modal — no other overlay in the codebase currently blurs the backdrop, so this is a small, contained CSS addition).
- Video frame: bordered (`1px solid` gold at low opacity), subtle radius, soft drop shadow — replacing the current bare `<video>` element's plain edges.
- Open/close transition: scale (0.94 → 1) + fade, using the site's existing `--ease-smooth` cubic-bezier, matching the mockup's timing.
- Close (`×`) and vertical-cut toggle buttons re-skinned to the mono/gold control style used elsewhere (e.g. `reel-modal-vertical` becomes a bordered gold-mono pill button).
- Disclosure caption repeated in the modal's control row (small, mono, near the vertical-cut toggle) so it's visible during playback too, not just on the card.

## Weekly auto-update

**Trigger:** add a `schedule` trigger alongside the existing `workflow_dispatch` in `render-highlights.yml`:

```yaml
on:
  workflow_dispatch:
  schedule:
    - cron: '0 9 * * 2'   # Tuesday 12:00 local (GMT+3, no DST) = 09:00 UTC
```

**Publish gating:** the render job's steps (checkout → extract images → Remotion install → fetch stats → editing agent → select score → render both cuts → poster still → web-encode → QA review → archive masters) are unchanged and run identically regardless of trigger.

Add a final step, gated to the scheduled run only:

```yaml
- name: Publish (scheduled runs only)
  if: github.event_name == 'schedule'
  ...
```

This step ports `gitPublish.mjs`'s `publish()` sequence directly into the workflow: `git lfs install` → `git fetch origin main` → `git reset --hard origin/main` → copy `highlights-web.mp4`/`highlights-vertical-web.mp4`/`highlights-poster.jpg` into `public/` (renamed as today) → `git add` → commit (`chore: regenerate highlights reel (scheduled)`) → push to `main` → wait for the ref to catch up → `gh workflow run deploy.yml --ref main`. Same diff-check-before-commit guard (`git diff --cached --quiet`) to skip a no-op publish when the new render is identical to what's live.

**On-demand runs are untouched.** `workflow_dispatch` (the admin's "Regenerate" button, or manual `gh workflow run`) still stops after "Archive full-quality masters" — no publish step runs — and the owner still reviews via Control Station before hitting Publish there. Only the unattended Tuesday run skips that review, since automating it is the explicit point of the schedule trigger.

## Files touched

- New `src/components/Showreel.jsx` + `.css`.
- `src/App.jsx` — mount `Showreel` between `Hero` and `FeaturedBanner`.
- `src/components/Hero.jsx` — remove the highlights link, `reelOpen` state, and modal mount.
- `src/components/HighlightsReelModal.jsx` / `.css` — visual restyle only, no prop/behavior changes.
- `src/i18n/en.json`, `src/i18n/ar.json` — new eyebrow/disclosure strings.
- `.github/workflows/render-highlights.yml` — add `schedule` trigger + gated publish step.

## Out of scope

- Any change to the editing agent's creative logic (project selection, music, section toggles) or the QA review agent.
- Changing on-demand behavior or removing the Control Station manual review flow — it stays exactly as-is for owner-triggered renders.
- Timezone/DST handling beyond the fixed GMT+3 → 09:00 UTC conversion (Jordan does not observe DST, so no adjustment logic is needed).
- Vertical-cut-specific UI changes beyond the existing toggle button's restyle.
