# Splash → Landing Transition: 4 Variants for Comparison

## Goal

Preview four different splash-screen-to-landing-page transitions on localhost, side by side, so a final choice can be made before anything ships. No production decision is made as part of this work — only the picked variant survives past this branch.

## Current baseline

`Preloader.jsx` exits via a hard-edge curtain-lift (`transform: translateY(-100%)`, 1s cubic-bezier). `Hero.jsx` fades/rises its content in underneath, gated by a `revealed` prop, starting slightly before the lift completes. This becomes **Variant A**.

## Variants

**A — Curtain-lift (baseline, unchanged)**
Existing behavior. No code changes; wired into the picker as-is.

**B — Liquid-crest morph**
The preloader panel keeps lifting, but its leading (bottom) edge grows an animated SVG wave — reusing the crest technique already in `LiquidTransition.jsx` (two path keyframes cross-animated via SVG `<animate>`). In the final ~30% of the lift, the panel's opacity fades to 0 instead of cutting hard at the top of the viewport, so the wave dissolves rather than snapping away.

**C — Wordmark morph**
The "Hashem Najdawi" text uses a Framer Motion shared-layout transition (`layoutId="wordmark"`) to shrink and translate from its centered splash position into the navbar logo slot. The rest of the splash chrome (grid lines, corner marks, counter) fades out around it on its own timer. Requires a matching `layoutId="wordmark"` element in `Navbar.jsx` to morph into.

**D — Blob takeover**
An SVG blob (same morph-by-`<animate>` technique as the two ambient blobs already in `Hero.jsx`) scales from a point at screen center to full coverage. Splash text/UI fades out first; once the blob covers the screen, the blob itself fades out to reveal the landing page.

## Switching mechanism (dev only)

- `App.jsx` gains a `transitionVariant` state (`'curtain' | 'liquid' | 'wordmark' | 'blob'`, default `'curtain'`) and a `replayKey` counter.
- New `TransitionPicker.jsx` + `.css`: a small floating panel, bottom-right, rendered only when `import.meta.env.DEV` is true. Four buttons, one per variant. Clicking a button sets `transitionVariant`, resets `revealed`/`preloaderGone` to `false`, and bumps `replayKey` so `<Preloader key={replayKey}>` remounts and replays the full sequence.
- The picker and the variant-branching logic are dev-only paths; variants B–D live behind straightforward conditionals in `Preloader.jsx`/`Preloader.css` so removing the losers later is a small, mechanical deletion.

## Files touched

- `src/App.jsx` — variant/replay state, render `TransitionPicker`, pass `variant` to `Preloader`, pass `revealed` to `Hero`/`Navbar` as today.
- `src/components/Preloader.jsx` / `.css` — branch exit animation per variant (B liquid-crest wave + fade, C wordmark `layoutId`, D blob takeover). Variant A is the existing code path, untouched.
- `src/components/Navbar.jsx` — add a `layoutId="wordmark"` target element for variant C to morph into (only visually relevant while variant C plays).
- New `src/components/TransitionPicker.jsx` + `.css`.

## Out of scope

- Deciding which variant ships. That happens after local review.
- Mobile-specific tuning for whichever variant is chosen — deferred until after selection.
- Removing the other 3 variants and the dev picker — a fast follow-up once a choice is made.
