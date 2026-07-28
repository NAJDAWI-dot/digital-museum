# Highlights Showreel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the buried "Watch the highlights" text link with a dedicated Showreel section, restyle the reel-playback modal, disclose that the reel is AI-curated, and make the reel auto-render-and-publish every Tuesday at 12pm local time (09:00 UTC) while leaving today's on-demand regenerate-and-manually-publish flow untouched.

**Architecture:** New `Showreel.jsx` component (mounted in `App.jsx` right after `Hero`) owns the reel-open state and renders a poster card; clicking it opens the existing `HighlightsReelModal`, whose CSS (and a small JSX addition for the disclosure line) gets restyled. `Hero.jsx` loses the old link/modal wiring entirely. Separately, `.github/workflows/render-highlights.yml` gains a `schedule` trigger and a publish step that only runs for that scheduled trigger, reusing the exact git sequence already proven in `remotion/control-station/lib/gitPublish.mjs`.

**Tech Stack:** React 19, Vite 8, react-i18next, Framer Motion, GitHub Actions (self-hosted runner), plain CSS (no CSS framework).

## Global Constraints

- Cron schedule: `0 9 * * 2` (Tuesday 09:00 UTC = 12:00 Jordan time, GMT+3, no DST).
- Publish step in the workflow runs only when `github.event_name == 'schedule'` — `workflow_dispatch` runs must stop exactly where they do today (after "Archive full-quality masters"), no publish.
- Disclosure copy (exact, both places it appears — Showreel card and modal controls row): en `"AI-curated reel · auto-updated every Tuesday"`, ar `"شريط منسّق بالذكاء الاصطناعي · يُحدَّث تلقائيًا كل ثلاثاء"`.
- No test framework exists in this repo (`package.json` has no `test` script, no `*.test.*` files) — verification is `npm run build` (catches syntax/JSX errors) plus a real headless-browser check using the repo's existing `scripts/vr-capture.mjs` against the local dev server, not unit tests.
- Follow existing patterns: sections read from `useMuseum()`/i18n like `FeaturedBanner.jsx`; colors/fonts only via the CSS custom properties already defined in `src/index.css` (`--ink`, `--gold`, `--gold-light`, `--font-serif`, `--font-mono`, `--ease-smooth`), never hardcoded hex duplicates.

---

### Task 1: Add i18n strings for the Showreel section

**Files:**
- Modify: `src/i18n/en.json:9-20` (inside the `"hero"` block, and add a new top-level `"highlights"` block after it)
- Modify: `src/i18n/ar.json:9-20` (same)

**Interfaces:**
- Produces: `t('highlights.eyebrow')`, `t('highlights.titleMain')`, `t('highlights.titleAccent')`, `t('highlights.disclosure')` — consumed by Task 2 (`Showreel.jsx`) and Task 4 (`HighlightsReelModal.jsx`). The existing `t('hero.highlights')` string is reused as-is (no change) as the card's play-label text.

- [ ] **Step 1: Add the new block to `src/i18n/en.json`**

Insert immediately after the closing `}` of the `"hero"` block (after line 20, before `"featured": {`):

```json
  "highlights": {
    "eyebrow": "Showreel",
    "titleMain": "See the whole museum,",
    "titleAccent": "in motion.",
    "disclosure": "AI-curated reel · auto-updated every Tuesday"
  },
```

- [ ] **Step 2: Add the matching block to `src/i18n/ar.json`**

Insert in the same position (after the `"hero"` block, before `"featured": {`):

```json
  "highlights": {
    "eyebrow": "أبرز اللحظات",
    "titleMain": "شاهد المتحف كاملاً،",
    "titleAccent": "في حركة.",
    "disclosure": "شريط منسّق بالذكاء الاصطناعي · يُحدَّث تلقائيًا كل ثلاثاء"
  },
```

- [ ] **Step 3: Verify both files are valid JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('src/i18n/en.json','utf8')); console.log('en.json OK')"
node -e "JSON.parse(require('fs').readFileSync('src/i18n/ar.json','utf8')); console.log('ar.json OK')"
```
Expected: both print `OK`. A `SyntaxError` means a trailing comma or bracket mistake — fix and re-run.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.json src/i18n/ar.json
git commit -m "i18n: add Showreel section strings"
```

---

### Task 2: Create the `Showreel` component

**Files:**
- Create: `src/components/Showreel.jsx`
- Create: `src/components/Showreel.css`
- Test (visual): manual dev-server check via `scripts/vr-capture.mjs` (see Step 4)

**Interfaces:**
- Consumes: `resolveAsset(src)` from `src/lib/assets.js` (signature: `(src: string) => string`, prepends `import.meta.env.BASE_URL` for repo-relative paths, passes through `data:`/`http(s):` URLs unchanged); `ShimmeringText` from `./anim/ShimmeringText.jsx` (props: `{ text: string }`); `Shine` from `./anim/Shine.jsx` (props: `{ children, className? }`); default export `HighlightsReelModal` from `./HighlightsReelModal.jsx` (props: `{ open: boolean, onClose: () => void }`, unchanged by this task).
- Produces: default export `Showreel` — a self-contained component with no required props, rendering a `<section id="showreel">`. Consumed by Task 3 (`App.jsx`).

- [ ] **Step 1: Write `src/components/Showreel.css`**

```css
.showreel-section {
  padding: 4rem 0 6rem;
}

.showreel-inner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.5rem;
  max-width: 720px;
}

.showreel-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 300;
  color: var(--linen);
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.showreel-title em {
  color: var(--gold-light);
  font-style: italic;
}

.showreel-shine {
  border-radius: 6px;
  width: 100%;
}

.showreel-card {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  cursor: none;
  border: 1px solid rgba(201, 169, 110, 0.2);
  transition: transform 0.5s var(--ease-smooth), border-color 0.5s ease;
}
.showreel-card:hover {
  transform: translateY(-4px);
  border-color: rgba(201, 169, 110, 0.55);
}

.showreel-card-media {
  aspect-ratio: 16 / 9;
  background-size: cover;
  background-position: center;
  background-color: var(--ink-light);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.showreel-card-media::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.6), transparent 45%);
}

.showreel-play-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 1px solid rgba(201, 169, 110, 0.7);
  background: rgba(13, 13, 13, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  transition: transform 0.3s ease, background 0.3s ease;
}
.showreel-card:hover .showreel-play-btn {
  transform: scale(1.08);
  background: rgba(201, 169, 110, 0.15);
}
.showreel-play-btn svg { margin-left: 3px; }

.showreel-card-foot {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  z-index: 1;
}
.showreel-card-label {
  font-style: italic;
  color: var(--linen);
  font-size: 1.1rem;
}
.showreel-card-duration {
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: var(--gold);
}

.showreel-disclosure {
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.85;
}

@media (max-width: 768px) {
  .showreel-section { padding: 2rem 0 3rem; }
  .showreel-play-btn { width: 52px; height: 52px; }
}
```

- [ ] **Step 2: Write `src/components/Showreel.jsx`**

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { resolveAsset } from '../lib/assets';
import ShimmeringText from './anim/ShimmeringText';
import Shine from './anim/Shine';
import HighlightsReelModal from './HighlightsReelModal';
import './Showreel.css';

// Reads the real reel duration off the video file itself (an off-DOM
// probe, never rendered) instead of hardcoding it — the render pipeline
// picks a random ~100s music window each run, so the true length drifts
// week to week.
function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function Showreel() {
  const { t } = useTranslation();
  const [reelOpen, setReelOpen] = useState(false);
  const [duration, setDuration] = useState(null);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.src = resolveAsset('highlights.mp4');
    const onLoaded = () => setDuration(formatDuration(probe.duration));
    probe.addEventListener('loadedmetadata', onLoaded);
    return () => probe.removeEventListener('loadedmetadata', onLoaded);
  }, []);

  return (
    <section id="showreel" className="showreel-section" ref={ref}>
      <div className="container">
        <motion.div
          className="showreel-inner"
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="section-label">
            <ShimmeringText text={t('highlights.eyebrow')} />
          </div>

          <h2 className="showreel-title serif">
            {t('highlights.titleMain')} <em>{t('highlights.titleAccent')}</em>
          </h2>

          <Shine className="showreel-shine">
            <div className="showreel-card" onClick={() => setReelOpen(true)} data-cursor>
              <div
                className="showreel-card-media"
                style={{ backgroundImage: `url(${resolveAsset('highlights-poster.jpg')})` }}
              >
                <div className="showreel-play-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--gold-light)">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="showreel-card-foot">
                  <span className="serif showreel-card-label">{t('hero.highlights')}</span>
                  {duration && <span className="mono showreel-card-duration">{duration}</span>}
                </div>
              </div>
            </div>
          </Shine>

          <p className="mono showreel-disclosure">{t('highlights.disclosure')}</p>
        </motion.div>
      </div>

      <HighlightsReelModal open={reelOpen} onClose={() => setReelOpen(false)} />
    </section>
  );
}
```

- [ ] **Step 3: Temporarily mount it standalone to verify it renders**

`Showreel` isn't wired into `App.jsx` until Task 3. To check it in isolation, temporarily add `import Showreel from './components/Showreel';` and `<Showreel />` right after `<Hero revealed={revealed} />` in `src/App.jsx` (inside the `<main>` block).

- [ ] **Step 4: Run the dev server and capture a screenshot**

```bash
npm run dev &
timeout 30 bash -c 'until curl -sf http://localhost:5173/digital-museum/ >/dev/null; do sleep 1; done'
SITE_URL=http://localhost:5173/digital-museum/ node scripts/vr-capture.mjs shoot /tmp/showreel-task2.png
```

Then read `/tmp/showreel-task2.png`. Expected: a "Showreel" eyebrow, a two-line serif heading with the second line in italic gold, and a card with a poster image (or the browser's broken-image icon if `public/highlights-poster.jpg` doesn't exist locally yet — that's fine, it's LFS-tracked and may not be pulled; the card's play button and layout should still be visible). Stop the dev server afterward (find its PID via `Get-NetTCPConnection`/`lsof` equivalent and kill it, or `Ctrl+C` if run in foreground).

- [ ] **Step 5: Revert the temporary mount from Step 3**

Undo the `Showreel` import and `<Showreel />` line added to `src/App.jsx` in Step 3 — Task 3 does the real wiring (in a different position, alongside the Hero cleanup).

- [ ] **Step 6: Commit**

```bash
git add src/components/Showreel.jsx src/components/Showreel.css
git commit -m "feat: add Showreel component (not yet mounted)"
```

---

### Task 3: Wire Showreel into App.jsx and remove the old trigger from Hero

**Files:**
- Modify: `src/App.jsx:7` (import), `src/App.jsx:119-120` (mount point)
- Modify: `src/components/Hero.jsx:1,6,39,174-183,188` (removals)
- Test (visual): manual dev-server check via `scripts/vr-capture.mjs`

**Interfaces:**
- Consumes: `Showreel` default export from Task 2 (no props).
- Produces: `Hero.jsx` no longer imports `HighlightsReelModal`, no longer holds `reelOpen` state, no longer renders the "Watch the highlights" button — later tasks touching `Hero.jsx` must not assume that state/button still exists.

- [ ] **Step 1: Add the import in `src/App.jsx`**

In `src/App.jsx`, immediately after line 7 (`import Hero from './components/Hero';`), add:

```jsx
import Showreel from './components/Showreel';
```

- [ ] **Step 2: Mount it right after Hero**

In `src/App.jsx`, change:

```jsx
          <Hero revealed={revealed} />
          <NowBlock />
```

to:

```jsx
          <Hero revealed={revealed} />
          <Showreel />
          <NowBlock />
```

- [ ] **Step 3: Remove the old trigger and modal from `src/components/Hero.jsx`**

Change the import line (line 1) from:

```jsx
import React, { useEffect, useRef, useState } from 'react';
```

to:

```jsx
import React, { useEffect, useRef } from 'react';
```

Remove line 6 entirely:

```jsx
import HighlightsReelModal from './HighlightsReelModal';
```

Remove line 39 entirely:

```jsx
  const [reelOpen, setReelOpen] = useState(false);
```

Remove this block (the third `Magnetic` button, currently lines 179-183):

```jsx
            <Magnetic strength={0.18}>
              <button type="button" className="hero-tour-link mono" onClick={() => setReelOpen(true)}>
                {t('hero.highlights')}
              </button>
            </Magnetic>
```

Remove this line (currently line 188, along with the blank line before it):

```jsx
      <HighlightsReelModal open={reelOpen} onClose={() => setReelOpen(false)} />
```

- [ ] **Step 4: Run the dev server and capture screenshots**

```bash
npm run dev &
timeout 30 bash -c 'until curl -sf http://localhost:5173/digital-museum/ >/dev/null; do sleep 1; done'
SITE_URL=http://localhost:5173/digital-museum/ node scripts/vr-capture.mjs shoot /tmp/showreel-task3.png
```

Read `/tmp/showreel-task3.png`. Expected: Hero shows only "Enter Exhibition" and "Take the guided tour" (no third "Watch the highlights" link), and the Showreel section now appears between Hero and NowBlock. Stop the dev server afterward.

- [ ] **Step 5: Run the build to catch any leftover references**

```bash
npm run build
```

Expected: builds clean, no "is not defined" or unused-import errors. (`npm run lint` will also flag `reelOpen`/`HighlightsReelModal` if the removal in Step 3 was incomplete — run it too and confirm no new errors, pre-existing warnings listed in Task 1 of the original error-check are expected and unrelated.)

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/components/Hero.jsx
git commit -m "feat: mount Showreel after Hero, remove old highlights link"
```

---

### Task 4: Restyle `HighlightsReelModal`

**Files:**
- Modify: `src/components/HighlightsReelModal.jsx:1,12,70-79` (add `useTranslation`, wrap controls, add disclosure line)
- Modify: `src/components/HighlightsReelModal.css` (full restyle)
- Test (visual): manual dev-server check via `scripts/vr-capture.mjs`

**Interfaces:**
- Consumes: `t('highlights.disclosure')` from Task 1's i18n additions.
- Produces: no prop/behavior change to `HighlightsReelModal` — `open`/`onClose` signature, ESC handling, and the wide/vertical toggle logic are all untouched. Only markup inside the existing structure gains a wrapping `<div className="reel-modal-controls">` and one new `<p>`.

- [ ] **Step 1: Add the translation import to `src/components/HighlightsReelModal.jsx`**

Change line 1 from:

```jsx
import React, { useEffect, useState } from 'react';
```

to:

```jsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
```

- [ ] **Step 2: Get `t` inside the component**

Immediately after line 13 (`const [variant, setVariant] = useState('wide');`), add:

```jsx
  const { t } = useTranslation();
```

- [ ] **Step 3: Wrap the controls and add the disclosure line**

Replace this block (currently lines 70-79):

```jsx
            <button
              type="button"
              className="reel-modal-vertical mono"
              onClick={() => setVariant(isVertical ? 'wide' : 'vertical')}
            >
              {isVertical ? '🖥 Cinematic cut (16:9)' : '📱 Vertical cut (9:16)'}
            </button>
            <button type="button" className="reel-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
```

with:

```jsx
            <div className="reel-modal-controls">
              <p className="mono reel-modal-disclosure">{t('highlights.disclosure')}</p>
              <button
                type="button"
                className="reel-modal-vertical mono"
                onClick={() => setVariant(isVertical ? 'wide' : 'vertical')}
              >
                {isVertical ? '🖥 Cinematic cut (16:9)' : '📱 Vertical cut (9:16)'}
              </button>
            </div>
            <button type="button" className="reel-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
```

- [ ] **Step 4: Replace `src/components/HighlightsReelModal.css` in full**

```css
.reel-modal-overlay {
  position: fixed; inset: 0; z-index: var(--z-lightbox);
  background: rgba(6,6,6,0.9);
  backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center;
  padding: 3rem;
}

.reel-modal-inner {
  position: relative;
  width: 100%;
  max-width: 1200px;
}

.reel-modal-video {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 4px;
  border: 1px solid rgba(201,169,110,0.3);
  box-shadow: 0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,169,110,0.06);
  background: var(--ink);
}

.reel-modal-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.9rem;
  flex-wrap: wrap;
}

.reel-modal-disclosure {
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold);
  opacity: 0.8;
}

/* In-place 16:9 ↔ 9:16 toggle — a button, never a link: navigating away
   would reload the SPA and replay the entrance preloader. */
.reel-modal-vertical {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.9rem;
  background: none;
  border: 1px solid rgba(201,169,110,0.35);
  border-radius: 3px;
  color: var(--gold);
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: border-color 0.3s ease, color 0.3s ease, background 0.3s ease;
}
.reel-modal-vertical:hover {
  border-color: var(--gold);
  background: rgba(201,169,110,0.1);
}

/* Vertical cut: height-bound instead of width-bound so 9:16 fits on screen. */
.reel-modal-inner.vertical {
  max-width: min(46vh, 92vw);
}
.reel-modal-video.vertical {
  aspect-ratio: 9/16;
  max-height: 82vh;
}

.reel-modal-close {
  position: absolute; top: -3rem; right: -0.5rem;
  background: none; border: 1px solid rgba(255,255,255,0.15); border-radius: 50%;
  width: 2.25rem; height: 2.25rem;
  color: rgba(255,255,255,0.7); font-size: 1.4rem; line-height: 1;
  transition: color 0.2s ease, border-color 0.2s ease;
}
.reel-modal-close:hover { color: var(--gold); border-color: var(--gold); }

@media (max-width: 768px) {
  .reel-modal-overlay { padding: 0; align-items: center; }
  .reel-modal-inner { padding: 0 1rem; }
  .reel-modal-close { top: -2.75rem; right: 0.5rem; }
  .reel-modal-controls { padding: 0 1rem; }
}
```

- [ ] **Step 5: Run the dev server, open the modal, and capture a screenshot**

`scripts/vr-capture.mjs` only shoots the page as-loaded — it doesn't click anything. Use a small one-off Playwright script instead (Chromium is already installed locally from this session's earlier work; if `npx playwright install chromium` hasn't been run before, run it first):

```bash
npm run dev &
timeout 30 bash -c 'until curl -sf http://localhost:5173/digital-museum/ >/dev/null; do sleep 1; done'
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/digital-museum/', { waitUntil: 'load' });
  await page.waitForSelector('.preloader', { state: 'detached', timeout: 30000 }).catch(() => {});
  await page.click('.showreel-card');
  await page.waitForSelector('.reel-modal-overlay', { timeout: 5000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/showreel-modal-task4.png' });
  await browser.close();
})();
"
```

Read `/tmp/showreel-modal-task4.png`. Expected: dimmed/blurred backdrop, bordered video frame with shadow, a control row below it showing the disclosure caption on one side and a bordered gold-mono "Vertical cut" pill button on the other, and a circular bordered close button top-right. Stop the dev server afterward.

- [ ] **Step 6: Run the build**

```bash
npm run build
```
Expected: builds clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/HighlightsReelModal.jsx src/components/HighlightsReelModal.css
git commit -m "style: restyle HighlightsReelModal, add AI-curation disclosure line"
```

---

### Task 5: Add the Tuesday auto-publish schedule to the render workflow

**Files:**
- Modify: `.github/workflows/render-highlights.yml`

**Interfaces:**
- Consumes: the exact git sequence from `remotion/control-station/lib/gitPublish.mjs`'s `publish()` function (fetch → reset --hard → copy 3 files → add → diff-check → commit → push → dispatch `deploy.yml`) — ported into workflow steps, not imported as code (GitHub Actions has no access to that Node module).
- Produces: no change to any other workflow's triggers or the render job's existing steps — `deploy.yml` continues to be dispatched the same way it already is from Control Station's manual flow.

- [ ] **Step 1: Add the schedule trigger**

In `.github/workflows/render-highlights.yml`, change:

```yaml
on:
  workflow_dispatch:
```

to:

```yaml
on:
  workflow_dispatch:
  # Tuesday 09:00 UTC = 12:00 Jordan time (GMT+3, no DST) — see the
  # "Publish (scheduled runs only)" step below for why only this trigger
  # auto-publishes.
  schedule:
    - cron: '0 9 * * 2'
```

- [ ] **Step 2: Add the gated publish step**

At the end of the `render:` job's `steps:` list, immediately after the existing "Archive full-quality masters" step (currently the last step, ending around line 133), add:

```yaml
      # Only the unattended Tuesday run publishes automatically — there's
      # no owner present to glance at the editing agent's picks (project
      # selection/order, music) the way the on-demand flow's Control
      # Station review does. workflow_dispatch runs (the admin's
      # "Regenerate" button, or a manual `gh workflow run`) stop here,
      # same as before this step was added. Sequence mirrors
      # remotion/control-station/lib/gitPublish.mjs's publish() exactly.
      - name: Publish (scheduled runs only)
        if: github.event_name == 'schedule'
        working-directory: .
        shell: 'C:\PROGRA~1\Git\usr\bin\bash.exe -e -o pipefail {0}'
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          git lfs install
          git fetch origin main
          git reset --hard origin/main
          cp remotion/out/highlights-web.mp4 public/highlights.mp4
          cp remotion/out/highlights-vertical-web.mp4 public/highlights-vertical.mp4
          cp remotion/out/highlights-poster.jpg public/highlights-poster.jpg
          git add public/highlights.mp4 public/highlights-vertical.mp4 public/highlights-poster.jpg
          if git diff --cached --quiet; then
            echo "No changes to publish (output identical to what's already live)."
            exit 0
          fi
          git commit -m "chore: regenerate highlights reel (scheduled)"
          git push origin HEAD:main
          NEW_SHA=$(git rev-parse HEAD)
          for i in $(seq 1 15); do
            REMOTE_SHA=$(gh api repos/${{ github.repository }}/git/ref/heads/main --jq .object.sha)
            if [ "$REMOTE_SHA" = "$NEW_SHA" ]; then break; fi
            sleep 2
          done
          gh workflow run deploy.yml --ref main
```

- [ ] **Step 3: Validate the YAML parses**

```bash
python -c "import yaml; yaml.safe_load(open('.github/workflows/render-highlights.yml')); print('YAML OK')"
```
Expected: prints `YAML OK`. A parser error means indentation broke — fix and re-run.

- [ ] **Step 4: Manually verify the on-demand path is unaffected**

Read the full file and confirm: the render job's steps before "Archive full-quality masters" are byte-for-byte unchanged, and the new "Publish (scheduled runs only)" step is the only new content, gated on `if: github.event_name == 'schedule'`. There is no automated way to actually fire this workflow from this environment (it requires the self-hosted `museum-render` runner, which is the owner's own PC) — this review step is the verification for this task.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/render-highlights.yml
git commit -m "ci: auto-publish highlights reel every Tuesday, leave on-demand renders manual"
```

---

## Self-Review Notes

- **Spec coverage:** Showreel section (Task 2/3) ✓, restyled modal (Task 4) ✓, AI disclosure in both places (Tasks 2 and 4) ✓, weekly auto-publish with on-demand untouched (Task 5) ✓, i18n en+ar (Task 1) ✓.
- **Out of scope confirmed untouched:** no changes to `agent-edit.mjs`/`agent-review.mjs` (the editing/QA agents), no changes to Control Station's manual publish flow or its UI, no DST logic (fixed UTC offset per the spec's own out-of-scope note).
- **Type/name consistency:** `Showreel` (component name), `.showreel-*` (CSS prefix), `highlights.*` (i18n namespace), `reel-modal-controls`/`reel-modal-disclosure` (new modal classes) are each introduced once and reused identically across the tasks that reference them.
