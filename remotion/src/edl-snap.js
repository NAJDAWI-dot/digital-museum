// Moves section boundaries onto the music's bar grid.
//
// The sections arrive with lengths chosen from content and taste; this
// nudges each boundary to the nearest bar line so the edit changes when the
// music does. Nudging, not rewriting: a boundary moves by at most a bar, so
// the pacing decisions upstream survive.
//
// Two details that are easy to get wrong and both matter:
//
// A dissolve's perceived cut is its midpoint, not its start. Snapping
// startFrame would put the *beginning* of a half-second dissolve on the beat,
// which lands the moment you actually perceive as the change a quarter second
// late. So dissolves snap their midpoint and hard cuts snap their start.
//
// Beat-locked transitions must use linear timing. springTiming's progress is
// not linear in time, so a spring dissolve is not half-dissolved at its
// midpoint, and the thing being snapped would not be where the snapping says
// it is. HighlightsReel picks the timing function per transition on this
// basis.

/** Frame positions of every bar line in the clip. */
export function barFrames(beatMap, fps) {
  if (!beatMap?.grid?.beats?.length) return [];
  const offset = beatMap.syncOffsetSeconds || 0;
  return beatMap.grid.downbeatIndices
    .map(i => beatMap.grid.beats[i])
    .filter(t => Number.isFinite(t))
    .map(t => Math.round((t + offset) * fps));
}

/** Frame positions of phrase starts — the strongest boundaries available. */
export function phraseFrames(beatMap, fps) {
  if (!beatMap?.grid?.beats?.length) return [];
  const offset = beatMap.syncOffsetSeconds || 0;
  return beatMap.grid.phraseIndices
    .map(i => beatMap.grid.beats[i])
    .filter(t => Number.isFinite(t))
    .map(t => Math.round((t + offset) * fps));
}

function nearest(grid, frame) {
  if (!grid.length) return null;
  let best = grid[0];
  let bestDist = Math.abs(grid[0] - frame);
  for (const g of grid) {
    const d = Math.abs(g - frame);
    if (d < bestDist) {
      bestDist = d;
      best = g;
    }
  }
  return best;
}

/** The frame a viewer perceives the change on. */
export function perceivedCutFrame(section) {
  const t = section.transitionIn;
  if (!t) return section.startFrame;
  return section.startFrame + Math.round(t.durationInFrames / 2);
}

/**
 * Snaps each section boundary to the bar grid.
 *
 * Sections keep their order and roughly their length; only the boundaries
 * move. The first section always starts at 0 and the last always ends at the
 * clip's usable end, so the reel still fits its music exactly.
 *
 * `minFrames` guards each section against being squeezed below the point
 * where its own animation stops fitting.
 */
export function snapSectionsToGrid(sections, {
  beatMap,
  fps,
  totalFrames,
  minFrames = 120,
  maxDriftBars = 1,
}) {
  const bars = barFrames(beatMap, fps);
  const phrases = phraseFrames(beatMap, fps);
  if (bars.length < 2) {
    return { sections: sections.slice(), snapped: false, reason: 'no bar grid' };
  }

  const barFramesLength = Math.round((beatMap.tempo.barSeconds || 2) * fps);
  const maxDrift = barFramesLength * maxDriftBars;

  const out = sections.map(s => ({ ...s }));
  const boundaries = [];

  // Where each section currently begins, as laid out by the caller.
  let cursor = 0;
  for (const section of out) {
    const tin = section.transitionIn ? section.transitionIn.durationInFrames : 0;
    cursor -= tin;
    section.startFrame = cursor;
    cursor += section.frames;
  }

  // Snap every boundary except the first (which is pinned at 0). Prefer a
  // phrase line when one is close — a phrase is a stronger musical seam than
  // an ordinary bar, and section changes are the reel's biggest moves.
  for (let i = 1; i < out.length; i++) {
    const section = out[i];
    const perceived = perceivedCutFrame(section);

    const phraseCandidate = nearest(phrases, perceived);
    const barCandidate = nearest(bars, perceived);

    // Prefer a phrase line when one is both close and reachable, but never
    // at the cost of the snap itself. Preferring a phrase and then rejecting
    // it for being too far used to discard a bar candidate that was well
    // within reach, leaving the boundary sitting mid-bar — the one case
    // that produced a cut a full half-bar off the grid.
    const candidates = [];
    if (phraseCandidate != null && Math.abs(phraseCandidate - perceived) <= barFramesLength * 0.75) {
      candidates.push({ target: phraseCandidate, to: 'phrase' });
    }
    if (barCandidate != null) candidates.push({ target: barCandidate, to: 'bar' });

    const chosen = candidates.find(c => Math.abs(c.target - perceived) <= maxDrift);
    if (!chosen) {
      const closest = candidates[0];
      boundaries.push({
        index: i,
        snapped: false,
        driftFrames: closest ? closest.target - perceived : null,
      });
      continue;
    }

    const delta = chosen.target - perceived;
    section.startFrame += delta;
    boundaries.push({ index: i, snapped: true, to: chosen.to, driftFrames: delta });
  }

  // Rebuild lengths from the snapped boundaries. A section's length is the
  // gap to the next section's start, plus the transition that overlaps it.
  for (let i = 0; i < out.length; i++) {
    const next = out[i + 1];
    const end = next
      ? next.startFrame + (next.transitionIn ? next.transitionIn.durationInFrames : 0)
      : totalFrames;
    out[i].frames = Math.max(minFrames, end - out[i].startFrame);
  }

  // Re-derive start frames so the list is internally consistent again after
  // any clamping above.
  cursor = 0;
  for (const section of out) {
    const tin = section.transitionIn ? section.transitionIn.durationInFrames : 0;
    cursor -= tin;
    section.startFrame = cursor;
    cursor += section.frames;
  }

  const total = out.reduce(
    (acc, s) => acc + s.frames - (s.transitionIn ? s.transitionIn.durationInFrames : 0),
    0,
  );

  return { sections: out, snapped: true, boundaries, totalFrames: total };
}

/** How far each perceived cut ends up from the nearest bar. The number to
 * watch: if this creeps up, the edit has stopped being locked to anything. */
export function snapReport(sections, beatMap, fps) {
  const bars = barFrames(beatMap, fps);
  if (!bars.length) return { errors: [], max: null };
  const errors = sections.slice(1).map(s => {
    const perceived = perceivedCutFrame(s);
    const target = nearest(bars, perceived);
    return target == null ? 0 : perceived - target;
  });
  return {
    errors,
    max: errors.length ? Math.max(...errors.map(Math.abs)) : null,
  };
}
