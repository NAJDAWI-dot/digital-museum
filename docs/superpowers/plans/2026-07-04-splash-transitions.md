# Splash Transition Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four selectable splash→landing transitions (existing curtain-lift, liquid-crest morph, wordmark morph, blob takeover) behind a dev-only picker so they can be compared on localhost before one is chosen to ship.

**Architecture:** `Preloader.jsx` gains a `variant` prop that branches its exit animation (CSS class + optional extra markup) and its internal exit timing (`EXIT_MS`/`REVEAL_DELAY` maps, replacing the single hardcoded `LIFT_MS`). `App.jsx` holds `transitionVariant` + `replayKey` state and renders a dev-only `TransitionPicker` that can reset and replay the whole splash sequence with a different variant. `Navbar.jsx` gets an optional shared-layout target for the wordmark variant. No test framework exists in this repo (`package.json` has no test script) — verification is `npm run lint`, `npm run build`, and a manual dev-server walkthrough described in each task.

**Tech Stack:** React 19, Framer Motion 12 (`motion.div`/`layoutId` for the wordmark morph), plain CSS keyframes + SVG SMIL `<animate>` for the liquid-crest and blob variants (matching the existing `LiquidTransition.jsx`/`Hero.jsx` techniques).

## Global Constraints

- No unit test framework is present — do not add one. Verification is `npm run lint`, `npm run build`, and manual visual check via `npm run dev`.
- Preserve `prefers-reduced-motion` behavior: the dev picker and all new variants must respect the existing `reduced` gate in `App.jsx` (reduced-motion visitors already skip the preloader entirely; leave that untouched).
- The dev picker must never appear in a production build — gate with `import.meta.env.DEV`.
- Reuse existing CSS custom properties (`--ink`, `--linen`, `--dust`, `--gold`, `--gold-light`, `--gold-dark`, `--z-preloader`) — do not hardcode new color values.
- Variant A (curtain) must remain pixel-identical to current behavior — it's the baseline for comparison.

---

### Task 1: Dev picker + variant/replay plumbing (baseline wired, no visual change)

**Files:**
- Create: `src/components/TransitionPicker.jsx`
- Create: `src/components/TransitionPicker.css`
- Modify: `src/App.jsx`
- Modify: `src/components/Preloader.jsx`

**Interfaces:**
- Produces: `Preloader({ onReveal, onDone, variant = 'curtain' })` — `variant` is one of `'curtain' | 'liquid' | 'wordmark' | 'blob'`.
- Produces: `TransitionPicker({ variant, onSelect })` — `onSelect(nextVariant: string)` is called when a button is clicked.
- Consumes (later tasks): Preloader's internal `EXIT_MS`/`REVEAL_DELAY` maps — Tasks 2-4 add their own key to each map, they don't change the map shape.

- [ ] **Step 1: Add variant/timing maps to `Preloader.jsx`, keep curtain behavior identical**

Replace the top of `src/components/Preloader.jsx` (lines 1-14) with:

```jsx
import React, { useEffect, useRef, useState } from 'react';
import './Preloader.css';

const NAME    = "Hashem Najdawi";
const LETTERS = NAME.split('');

/* Exit duration per variant — each must match the CSS animation duration
   (plus any internal delay) used by `.preloader.variant-<name>.exit`. */
const EXIT_MS = {
  curtain:  1000,
  liquid:   1150,
  wordmark: 900,
  blob:     1900,
};

/* How long after the 'exit' class is added before onReveal() fires — i.e.
   how long the hero stays hidden behind the splash once the exit starts.
   Zero for variants where the hero should rise the instant the exit begins. */
const REVEAL_DELAY = {
  curtain:  0,
  liquid:   0,
  wordmark: 0,
  blob:     1400,
};

export default function Preloader({ onReveal, onDone, variant = 'curtain' }) {
```

- [ ] **Step 2: Use the maps instead of the hardcoded `LIFT_MS` constant**

In the same file, replace the curtain-lift scheduling block (previously using `LIFT_MS`):

```jsx
          /* ── Phase 3: exit ── */
          timers.push(setTimeout(() => {
            setPhase('exiting');
            if (wrapRef.current) wrapRef.current.classList.add('exit');
            const revealDelay = REVEAL_DELAY[variant] ?? 0;
            if (revealDelay > 0) {
              timers.push(setTimeout(() => onReveal?.(), revealDelay));
            } else {
              // Hand off the instant the exit starts so the hero rises
              // into view behind it — the reveal and the exit are one gesture.
              onReveal?.();
            }
            // Unmount only once the exit animation has fully finished.
            timers.push(setTimeout(() => onDone?.(), EXIT_MS[variant] ?? EXIT_MS.curtain));
          }, 150));
```

Update the effect's dependency array from `[onReveal, onDone]` to `[onReveal, onDone, variant]`.

- [ ] **Step 3: Apply the variant as a CSS class on the root element**

Change the root `div` in the same file's return statement from:
```jsx
    <div className={`preloader ${phase}`} ref={wrapRef}>
```
to:
```jsx
    <div className={`preloader ${phase} variant-${variant}`} ref={wrapRef}>
```

- [ ] **Step 4: Add variant/replay state and the dev picker to `App.jsx`**

In `src/App.jsx`, inside `MuseumApp`, replace:
```jsx
  const [revealed, setRevealed] = useState(reduced);
  const [preloaderGone, setPreloaderGone] = useState(reduced);
```
with:
```jsx
  const [revealed, setRevealed] = useState(reduced);
  const [preloaderGone, setPreloaderGone] = useState(reduced);
  const [transitionVariant, setTransitionVariant] = useState('curtain');
  const [replayKey, setReplayKey] = useState(0);

  // Dev-only: replay the full splash→landing sequence with a different variant.
  const replayWithVariant = (nextVariant) => {
    setTransitionVariant(nextVariant);
    setRevealed(false);
    setPreloaderGone(false);
    setReplayKey((k) => k + 1);
  };
```

Then update the `Preloader` render and add the picker:
```jsx
      {!preloaderGone && (
        <Preloader
          key={replayKey}
          variant={transitionVariant}
          onReveal={() => setRevealed(true)}
          onDone={() => setPreloaderGone(true)}
        />
      )}
```
and, just before the closing `</>` of `MuseumApp`'s returned fragment:
```jsx
      {import.meta.env.DEV && !reduced && (
        <TransitionPicker variant={transitionVariant} onSelect={replayWithVariant} />
      )}
```

Add the import near the other component imports:
```jsx
import TransitionPicker from './components/TransitionPicker';
```

- [ ] **Step 5: Create `src/components/TransitionPicker.jsx`**

```jsx
import React from 'react';
import './TransitionPicker.css';

const VARIANTS = [
  { id: 'curtain',  label: 'A · Curtain' },
  { id: 'liquid',   label: 'B · Liquid crest' },
  { id: 'wordmark', label: 'C · Wordmark morph' },
  { id: 'blob',     label: 'D · Blob takeover' },
];

// Dev-only harness for comparing splash-transition variants on localhost.
// Never rendered in production — App.jsx gates it behind import.meta.env.DEV.
export default function TransitionPicker({ variant, onSelect }) {
  return (
    <div className="transition-picker">
      <span className="transition-picker-label mono">Splash transition</span>
      <div className="transition-picker-buttons">
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`transition-picker-btn ${variant === v.id ? 'active' : ''}`}
            onClick={() => onSelect(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `src/components/TransitionPicker.css`**

```css
.transition-picker {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0.9rem;
  background: rgba(13, 13, 13, 0.9);
  border: 1px solid rgba(201, 169, 110, 0.35);
  border-radius: 6px;
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.transition-picker-label {
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--dust);
}

.transition-picker-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  max-width: 220px;
}

.transition-picker-btn {
  font-size: 0.65rem;
  letter-spacing: 0.03em;
  padding: 0.35rem 0.55rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: var(--linen);
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.transition-picker-btn:hover {
  border-color: var(--gold);
  color: var(--gold);
}

.transition-picker-btn.active {
  border-color: var(--gold-dark);
  color: var(--gold);
  background: rgba(201, 169, 110, 0.08);
}
```

- [ ] **Step 7: Verify baseline is unchanged**

Run: `cd D:/museum && npm run lint`
Expected: no errors.

Run: `cd D:/museum && npm run dev`
Then in a browser open the printed localhost URL. Expected:
- Splash plays exactly as before (letter-by-letter name, counter, curtain-lift exit) — variant "A · Curtain" is active by default.
- A small panel appears bottom-right with 4 buttons.
- Clicking "A · Curtain" replays the full splash sequence from the start.

- [ ] **Step 8: Commit**

```bash
cd D:/museum && git add src/App.jsx src/components/Preloader.jsx src/components/TransitionPicker.jsx src/components/TransitionPicker.css && git commit -m "Add dev-only transition picker and variant plumbing (baseline curtain unchanged)"
```

---

### Task 2: Variant B — liquid-crest morph

**Files:**
- Modify: `src/components/Preloader.jsx`
- Modify: `src/components/Preloader.css`

**Interfaces:**
- Consumes: `EXIT_MS`/`REVEAL_DELAY` maps and `variant` prop from Task 1 (already has a `liquid` key).
- Produces: nothing new consumed by later tasks — self-contained.

- [ ] **Step 1: Add the crest SVG, rendered only for the `liquid` variant**

In `src/components/Preloader.jsx`, inside the returned JSX, immediately before the closing `</div>` of the root `preloader` div (i.e. right after the `pl-bottom` block), add:

```jsx
      {variant === 'liquid' && (
        <div className="pl-crest" aria-hidden="true">
          <svg className="pl-crest-svg" viewBox="0 0 1440 200" preserveAspectRatio="none">
            <path className="pl-crest-fill" d="M0,60 C240,100 480,20 720,55 C960,90 1200,15 1440,55 L1440,200 L0,200 Z">
              <animate
                attributeName="d"
                begin="indefinite"
                id="pl-crest-anim"
                dur="1.15s"
                fill="freeze"
                values="M0,60 C240,100 480,20 720,55 C960,90 1200,15 1440,55 L1440,200 L0,200 Z;
                        M0,30 C240,70 480,110 720,35 C960,75 1200,110 1440,35 L1440,200 L0,200 Z;
                        M0,10 C240,25 480,5 720,15 C960,25 1200,5 1440,15 L1440,200 L0,200 Z" />
            </path>
            <path className="pl-crest-line" fill="none"
              d="M0,60 C240,100 480,20 720,55 C960,90 1200,15 1440,55">
              <animate
                attributeName="d"
                begin="indefinite"
                id="pl-crest-line-anim"
                dur="1.15s"
                fill="freeze"
                values="M0,60 C240,100 480,20 720,55 C960,90 1200,15 1440,55;
                        M0,30 C240,70 480,110 720,35 C960,75 1200,110 1440,35;
                        M0,10 C240,25 480,5 720,15 C960,25 1200,5 1440,15" />
            </path>
          </svg>
        </div>
      )}
```

- [ ] **Step 2: Start the crest's SMIL animation when the exit begins**

The `<animate begin="indefinite">` elements above need to be triggered manually (SMIL doesn't auto-start with `begin="indefinite"`). In the same file, inside the Phase 3 timeout block added in Task 1, right after `wrapRef.current.classList.add('exit');`, add:

```jsx
            if (variant === 'liquid' && wrapRef.current) {
              wrapRef.current.querySelectorAll('animate').forEach((el) => {
                if (typeof el.beginElement === 'function') el.beginElement();
              });
            }
```

- [ ] **Step 3: Style the crest and the liquid exit animation**

In `src/components/Preloader.css`, add after the existing `pl-seam` keyframes block (after line 44):

```css
/* ── Variant: liquid-crest morph ──
   The panel's leading (bottom) edge grows an animated wave as it lifts, and
   the panel fades out in the final third instead of cutting hard. ── */
.preloader.variant-liquid::before {
  display: none; /* the crest replaces the flat seam line */
}

@keyframes pl-lift-liquid {
  0%   { transform: translateY(0);     opacity: 1; }
  60%  { transform: translateY(-60%);  opacity: 1; }
  100% { transform: translateY(-100%); opacity: 0; }
}

.preloader.variant-liquid.exit {
  animation: pl-lift-liquid 1.15s cubic-bezier(0.76, 0, 0.24, 1) forwards;
}

.pl-crest {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 22vh;
  margin-top: -1px;
  overflow: visible;
  pointer-events: none;
  z-index: 3;
}

.pl-crest-fill { fill: var(--ink); }

.pl-crest-line {
  stroke: var(--gold);
  stroke-width: 2;
  opacity: 0.85;
  filter: drop-shadow(0 0 6px rgba(201, 169, 110, 0.5));
}
```

- [ ] **Step 4: Verify**

Run: `cd D:/museum && npm run lint`
Expected: no errors.

Run: `cd D:/museum && npm run dev`, open the browser, click "B · Liquid crest" in the picker. Expected:
- Splash plays identically through the counter.
- On exit, the panel lifts while a gold-edged wave ripples along its trailing bottom edge.
- The panel visibly fades out (rather than hard-cutting) as it clears the top of the viewport.
- Clicking "A · Curtain" afterward still reproduces the original unchanged behavior (confirms the two variants don't leak state into each other).

- [ ] **Step 5: Commit**

```bash
cd D:/museum && git add src/components/Preloader.jsx src/components/Preloader.css && git commit -m "Add liquid-crest morph splash transition (variant B)"
```

---

### Task 3: Variant C — wordmark morph into navbar

**Files:**
- Modify: `src/components/Preloader.jsx`
- Modify: `src/components/Preloader.css`
- Modify: `src/components/Navbar.jsx`

**Interfaces:**
- Consumes: `EXIT_MS.wordmark`/`REVEAL_DELAY.wordmark` from Task 1; `variant` prop.
- Produces: `Navbar({ revealed, wordmarkMorph = false })` — new optional prop.

- [ ] **Step 1: Make the splash name a `motion.div` with a conditional `layoutId`**

In `src/components/Preloader.jsx`, add the Framer Motion import:
```jsx
import { motion } from 'framer-motion';
```

Replace:
```jsx
        <div className="pl-name serif" aria-label={NAME}>
```
with:
```jsx
        <motion.div
          className="pl-name serif"
          aria-label={NAME}
          layoutId={variant === 'wordmark' ? 'wordmark' : undefined}
        >
```
and its matching closing tag from `</div>` to `</motion.div>` (this is the element that wraps the per-letter `.pl-letter` spans).

- [ ] **Step 2: Give the wordmark variant its own exit CSS (fade backdrop, not lift)**

In `src/components/Preloader.css`, add after the liquid-crest block from Task 2:

```css
/* ── Variant: wordmark morph ──
   The backdrop fades to transparent (not a hard opacity fade, so the
   .pl-name element — animated separately via Framer Motion's layoutId — is
   unaffected and can morph into the navbar logo). Everything else fades
   out as a group so only the wordmark survives the transition. ── */
.preloader.variant-wordmark::before {
  display: none;
}

@keyframes pl-bg-fade {
  to { background-color: transparent; }
}

.preloader.variant-wordmark.exit {
  animation: pl-bg-fade 0.9s ease forwards;
  pointer-events: none;
}

@keyframes pl-fade-only {
  to { opacity: 0; }
}

.preloader.variant-wordmark.exit .pl-grid,
.preloader.variant-wordmark.exit .pl-corner,
.preloader.variant-wordmark.exit .pl-line-wrap,
.preloader.variant-wordmark.exit .pl-sub,
.preloader.variant-wordmark.exit .pl-bottom {
  animation: pl-fade-only 0.6s ease forwards;
}
```

- [ ] **Step 3: Add a matching shared-layout target in the navbar logo**

In `src/components/Navbar.jsx`, add the import:
```jsx
import { motion } from 'framer-motion';
```

Change the function signature:
```jsx
export default function Navbar({ revealed = true, wordmarkMorph = false }) {
```

Replace:
```jsx
        <a href="#" className="navbar-logo serif" aria-label="Hashem Najdawi Museum Home">
          Hashem Najdawi
        </a>
```
with:
```jsx
        <motion.a
          href="#"
          className="navbar-logo serif"
          aria-label="Hashem Najdawi Museum Home"
          layoutId={wordmarkMorph ? 'wordmark' : undefined}
        >
          Hashem Najdawi
        </motion.a>
```

- [ ] **Step 4: Wire the new prop through from `App.jsx`**

In `src/App.jsx`, change:
```jsx
        <Navbar revealed={revealed} />
```
to:
```jsx
        <Navbar revealed={revealed} wordmarkMorph={transitionVariant === 'wordmark'} />
```

- [ ] **Step 5: Verify**

Run: `cd D:/museum && npm run lint`
Expected: no errors.

Run: `cd D:/museum && npm run dev`, open the browser, click "C · Wordmark morph". Expected:
- Splash plays identically through the counter.
- On exit, the background dissolves and the grid/corners/counter/subtitle fade out, while the "Hashem Najdawi" text visibly shrinks and slides from center-screen into the navbar's logo position, landing there as the navbar fades in.
- Known limitation (acceptable for this comparison pass, not a bug to chase): the navbar is still completing its own `translateY(-14px) → 0` entrance at the same moment, so the landing point may be a few pixels off during the last fraction of the animation — call this out when comparing, don't polish it now.
- Switching back to "A · Curtain" still behaves exactly as the original.

- [ ] **Step 6: Commit**

```bash
cd D:/museum && git add src/components/Preloader.jsx src/components/Preloader.css src/components/Navbar.jsx src/App.jsx && git commit -m "Add wordmark shared-layout morph splash transition (variant C)"
```

---

### Task 4: Variant D — blob takeover

**Files:**
- Modify: `src/components/Preloader.jsx`
- Modify: `src/components/Preloader.css`

**Interfaces:**
- Consumes: `EXIT_MS.blob` (1900) / `REVEAL_DELAY.blob` (1400) from Task 1; `variant` prop.
- Produces: nothing new consumed by later tasks — self-contained.

- [ ] **Step 1: Add the blob SVG, rendered only for the `blob` variant**

In `src/components/Preloader.jsx`, add this alongside the liquid-crest block from Task 2 (both are conditionally rendered siblings, order doesn't matter):

```jsx
      {variant === 'blob' && (
        <div className="pl-blob-wrap" aria-hidden="true">
          <svg className="pl-blob" viewBox="0 0 600 600">
            <path fill="var(--ink)" stroke="var(--gold)" strokeWidth="1.5">
              <animate attributeName="d" begin="indefinite" id="pl-blob-morph"
                dur="1.6s" fill="freeze"
                values="M300,90 C420,90 520,180 520,300 C520,420 420,510 300,510 C180,510 80,420 80,300 C80,180 180,90 300,90 Z;
                        M300,60 C460,60 540,160 540,300 C540,440 460,540 300,540 C140,540 60,440 60,300 C60,160 140,60 300,60 Z;
                        M300,40 C480,40 560,150 560,300 C560,450 480,560 300,560 C120,560 40,450 40,300 C40,150 120,40 300,40 Z" />
            </path>
          </svg>
        </div>
      )}
```

- [ ] **Step 2: Trigger the blob's SMIL animation when the exit begins**

In the Phase 3 timeout block (same place as Task 2's Step 2), extend the trigger to cover the blob too:

```jsx
            if ((variant === 'liquid' || variant === 'blob') && wrapRef.current) {
              wrapRef.current.querySelectorAll('animate').forEach((el) => {
                if (typeof el.beginElement === 'function') el.beginElement();
              });
            }
```

(This replaces the `variant === 'liquid'` check added in Task 2 — same guard clause, now covering both variants since both use SMIL `begin="indefinite"` animations.)

- [ ] **Step 3: Style the blob growth/cover/fade and the chrome fade-out**

In `src/components/Preloader.css`, add after the wordmark block from Task 3:

```css
/* ── Variant: blob takeover ──
   Splash chrome fades fast; an organic blob grows from center to fully
   cover the screen, then the blob (and the backdrop behind it) fades out
   together to reveal the landing page. ── */
.preloader.variant-blob::before {
  display: none;
}

.preloader.variant-blob.exit .pl-grid,
.preloader.variant-blob.exit .pl-corner,
.preloader.variant-blob.exit .pl-center,
.preloader.variant-blob.exit .pl-bottom {
  animation: pl-fade-only 0.35s ease forwards;
}

.preloader.variant-blob.exit {
  animation: pl-bg-fade 0.5s ease 1.4s forwards;
}

.pl-blob-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 4;
}

.pl-blob {
  width: 60vmax;
  height: 60vmax;
  transform: scale(0.05);
  opacity: 1;
}

.preloader.variant-blob.exit .pl-blob {
  animation: pl-blob-grow 1.6s cubic-bezier(0.65, 0, 0.35, 1) 0.3s forwards;
}

@keyframes pl-blob-grow {
  0%   { transform: scale(0.05); opacity: 1; }
  56%  { transform: scale(3);    opacity: 1; }
  100% { transform: scale(3.4);  opacity: 0; }
}
```

`pl-fade-only` and `pl-bg-fade` are already defined in Task 3's CSS addition — reused here, not redefined.

- [ ] **Step 4: Verify**

Run: `cd D:/museum && npm run lint`
Expected: no errors.

Run: `cd D:/museum && npm run dev`, open the browser, click "D · Blob takeover". Expected:
- Splash plays identically through the counter.
- On exit, the grid/corners/name/counter fade out quickly (~0.35s).
- A gold-edged organic blob grows from the center, its silhouette continuously reshaping, until it covers the full viewport.
- The covering blob (and the backdrop behind it) fades out together to reveal the hero underneath.
- Total sequence feels close to ~1.9s from exit start to hero fully visible.
- Switching back to "A · Curtain" still behaves exactly as the original.

- [ ] **Step 5: Commit**

```bash
cd D:/museum && git add src/components/Preloader.jsx src/components/Preloader.css && git commit -m "Add blob takeover splash transition (variant D)"
```

---

### Task 5: Full production build check across all 4 variants

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Confirm the dev picker is excluded from production builds**

Run: `cd D:/museum && npm run build`
Expected: build succeeds with no errors.

Run: `cd D:/museum && npm run preview`, open the printed URL. Expected: the transition picker panel does NOT appear (production build, `import.meta.env.DEV` is false), and the splash still plays using the default `curtain` variant.

- [ ] **Step 2: Full manual comparison pass**

Run: `cd D:/museum && npm run dev`, open the browser. For each of the 4 picker buttons, click it and confirm the sequence matches its Task's "Expected" list above. Take note of which one you prefer — this is the input to the next (out-of-scope-for-this-plan) step of stripping the other 3 and the picker before shipping.

- [ ] **Step 3: Commit the plan/spec status (no code changes)**

No commit needed for this task — it's verification-only. If any variant's manual check fails, stop and fix it in its own task's files before moving on, per this plan's task boundaries.
