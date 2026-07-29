// The EDL (edit decision list) is the reel's cut, as data: every section's
// start frame, length and incoming transition, plus the montage's shot list.
// It is built before the render (scripts/build-edl.mjs) and read by the
// composition, so the edit can be decided by something that knows about the
// music without the composition needing to know anything about music.
//
// Plain JS — no JSX, no Remotion imports — so build-edl, verify-edl and
// agent-review can all import it directly.
//
// Units are frames, always. The conversion from seconds happens exactly once,
// in build-edl.mjs; nothing downstream ever sees a second.
import {
  buildSectionList,
  buildProjectShotList,
  transitionFrames,
  PROJECTS_MONTAGE_SHOT_FRAMES,
} from './reel-timing.js';
import { varySections, restack, variedTransitionFrames } from './edl-variation.js';
import { snapSectionsToGrid, snapReport } from './edl-snap.js';
import { planMontage } from './montage-rhythm.js';
import { createRng } from './rng.js';
import { validatePacingPlan } from './pacing-plan.js';

export const EDL_VERSION = 1;

export const TRANSITION_TYPES = ['dissolve', 'slideUp', 'wipe', 'crossZoom'];

/** Identifies the content the EDL was built for. If the reel's inputs change
 * after an EDL is built — someone edits reel-config in the Control Station
 * between build-edl and render — the shot list can reference projects that
 * are no longer in the montage. Comparing hashes catches that and lets the
 * composition fall back rather than render a stale cut. */
export function hashContent(data) {
  const shots = buildProjectShotList(data.showcaseProjects, data.photosPerProject);
  const parts = [
    (data.showcaseProjects || []).map(p => p.id).join(','),
    String(data.photosPerProject),
    String(shots.length),
    [data.showTimeline, data.showVolunteering, data.showTestimonial].map(Boolean).join(','),
  ];
  // Not cryptographic — just has to change when any of the above changes,
  // and be computable without node:crypto so the bundle can call it too.
  const joined = parts.join('|');
  let h = 5381;
  for (let i = 0; i < joined.length; i++) h = ((h * 33) ^ joined.charCodeAt(i)) >>> 0;
  return `${h.toString(16)}-${joined.length}`;
}

/** Today's cut, expressed as an EDL. This is the fallback, and it is
 * deliberately the *current* behaviour rather than a degraded version of it:
 * if analysis fails, or an EDL is stale or malformed, the reel that renders
 * is exactly the one that would have rendered anyway. */
export function buildFallbackEdl(data, {
  fps = 60,
  mode = 'fallback-fixed',
  seed = null,
  beatMap = null,
  pacingPlan = null,
} = {}) {
  // A missing or malformed plan validates down to the defaults, so the cut is
  // never blocked on the agent having run.
  const pacing = validatePacingPlan(pacingPlan, {
    projectIds: (data.showcaseProjects || []).map(p => p.id),
  });
  let base = seed == null
    ? buildSectionList(data)
    : restack(varySections(buildSectionList(data), {
      seed,
      transitionFramesFor: variedTransitionFrames,
      pacing,
    }));

  // Beat-locking, when the music analysis is good enough to support it.
  //
  // The governing asymmetry: a dissolve landing 200ms off reads as fine, a
  // hard cut landing 200ms off reads as broken. So low confidence softens
  // the edit rather than merely loosening the snap — see the level checks
  // in edl-variation and the transition palette.
  let snap = null;
  const level = beatMap?.quality?.level;
  if (beatMap && (level === 'high' || level === 'medium')) {
    const naturalTotal = base.reduce(
      (t, s) => t + s.frames - transitionFrames(s.transitionIn),
      0,
    );
    const target = beatMap.reelSeconds
      ? Math.round(beatMap.reelSeconds * fps)
      : naturalTotal;
    snap = snapSectionsToGrid(base, {
      beatMap,
      fps,
      totalFrames: target,
      // A phrase is only a stronger seam if we can reach it; on a medium
      // grid keep boundaries closer to where taste put them.
      maxDriftBars: level === 'high' ? 1 : 0.5,
    });
    if (snap.snapped) base = snap.sections;
  }

  const sections = base.map(section => {
    const entry = {
      id: section.id,
      component: section.component,
      startFrame: section.startFrame,
      durationInFrames: section.frames,
      transitionIn: section.transitionIn,
    };
    if (section.id === 'montage') {
      entry.shots = buildMontageShots(data, {
        totalFrames: section.frames,
        beatMap,
        fps,
        startFrame: section.startFrame,
        rng: seed == null ? null : createRng((seed ^ 0x9e3779b9) >>> 0),
        pacing,
      });
    }
    return entry;
  });

  const report = beatMap && snap?.snapped ? snapReport(base, beatMap, fps) : null;

  return {
    version: EDL_VERSION,
    fps,
    mode: snap?.snapped ? 'beat-locked' : mode,
    seed,
    pacing: {
      energy: pacing.energy,
      rhythm: pacing.montage.rhythm,
      moveStyle: pacing.montage.moveStyle,
      heroProjectId: pacing.montage.heroProjectId,
      punchIns: pacing.montage.punchIns,
    },
    music: beatMap
      ? {
        track: beatMap.source?.track ?? null,
        bpm: beatMap.tempo?.bpm ?? null,
        barSeconds: beatMap.tempo?.barSeconds ?? null,
        quality: beatMap.quality?.level ?? 'none',
        syncOffsetSeconds: beatMap.syncOffsetSeconds ?? 0,
        // Beat positions in frames, so the composition can see the grid the
        // cut was built against without loading the beat map (which is a
        // per-render artifact the bundle never sees). ~110 integers.
        beatFrames: (beatMap.grid?.beats ?? []).map(
          t => Math.round((t + (beatMap.syncOffsetSeconds ?? 0)) * fps),
        ),
        downbeatFrames: (beatMap.grid?.downbeatIndices ?? []).map(
          i => Math.round(((beatMap.grid.beats[i] ?? 0) + (beatMap.syncOffsetSeconds ?? 0)) * fps),
        ),
      }
      : null,
    // How far each perceived cut sits from its nearest bar line. Worth
    // watching over time: if it creeps up, the edit has quietly stopped
    // being locked to anything.
    snapErrorFrames: report ? report.errors : null,
    maxSnapErrorFrames: report ? report.max : null,
    // Derived from the sections actually emitted, not recomputed from the
    // data — with variation applied these differ, and the renderer must be
    // sized to what it will really play.
    totalFrames: sections.reduce(
      (total, s) => total + s.durationInFrames - transitionFrames(s.transitionIn),
      0,
    ),
    contentHash: hashContent(data),
    audio: { src: 'audio/theme.mp3' },
    sections,
  };
}

/** Montage shots at the fixed dwell time. Shot startFrames are montage-local
 * (frame 0 is the section's own frame 0), because that is what
 * useCurrentFrame() reports inside the Sequence. */
export function buildMontageShots(data, {
  totalFrames = null,
  beatMap = null,
  fps = 60,
  startFrame = 0,
  rng = null,
  pacing = null,
} = {}) {
  const shots = buildProjectShotList(data.showcaseProjects, data.photosPerProject);
  if (shots.length === 0) return [];

  // Shots must tile the section exactly — the montage's length is set by
  // beat-snapping and section jitter, not by the shot count.
  const span = totalFrames ?? shots.length * PROJECTS_MONTAGE_SHOT_FRAMES;

  const planned = planMontage(shots, {
    beatMap,
    fps,
    startFrame,
    durationInFrames: span,
    rng,
    pacing,
  });

  return planned.map(entry => ({
    index: entry.index,
    projectId: entry.shot.project?.id ?? null,
    src: entry.shot.src,
    shotIndexInProject: entry.shot.shotIndexInProject,
    plateIndex: entry.plateIndex,
    startFrame: entry.startFrame,
    durationInFrames: entry.durationInFrames,
    beats: entry.beats ?? null,
    move: entry.move,
    cutIn: entry.cutIn,
    framing: entry.framing,
    isPunchIn: entry.isPunchIn,
  }));
}

/** Structural validation. Returns the EDL if it is internally consistent and
 * describes the same content, otherwise null — callers fall back.
 *
 * These are the invariants that, when violated, produce either a crash or a
 * silently wrong video, so they are worth checking before a GPU render rather
 * than discovering afterwards. */
export function validateEdl(edl, { fps, data } = {}) {
  const problems = collectEdlProblems(edl, { fps, data });
  return problems.length === 0 ? edl : null;
}

/** The same checks, but reporting *why* — used by verify-edl.mjs so a
 * failure names the invariant instead of just refusing. */
export function collectEdlProblems(edl, { fps, data } = {}) {
  const problems = [];
  const fail = (msg) => problems.push(msg);

  if (!edl || typeof edl !== 'object') return ['EDL is not an object'];
  if (edl.version !== EDL_VERSION) fail(`version ${edl.version} != expected ${EDL_VERSION}`);
  if (fps != null && edl.fps !== fps) fail(`fps ${edl.fps} != composition fps ${fps}`);
  if (!Array.isArray(edl.sections) || edl.sections.length === 0) return [...problems, 'no sections'];

  if (data && edl.contentHash !== hashContent(data)) {
    fail(`contentHash ${edl.contentHash} != current content ${hashContent(data)} (EDL is stale)`);
  }

  let expectedStart = 0;
  let runningTotal = 0;

  edl.sections.forEach((s, i) => {
    const where = `section[${i}] "${s.id}"`;
    if (!Number.isInteger(s.durationInFrames) || s.durationInFrames <= 0) {
      fail(`${where}: durationInFrames must be a positive integer, got ${s.durationInFrames}`);
    }
    const tin = transitionFrames(s.transitionIn);
    if (s.transitionIn) {
      if (!TRANSITION_TYPES.includes(s.transitionIn.type)) {
        fail(`${where}: unknown transition type "${s.transitionIn.type}"`);
      }
      if (!Number.isInteger(tin) || tin <= 0) {
        fail(`${where}: transition durationInFrames must be a positive integer, got ${tin}`);
      }
      // TransitionSeries throws if a transition is longer than either
      // neighbouring sequence. Catching it here costs nothing; catching it
      // during a render costs the whole render.
      const prev = edl.sections[i - 1];
      if (prev && tin > prev.durationInFrames) {
        fail(`${where}: transition ${tin}f longer than preceding "${prev.id}" (${prev.durationInFrames}f)`);
      }
      if (tin > s.durationInFrames) {
        fail(`${where}: transition ${tin}f longer than the section itself (${s.durationInFrames}f)`);
      }
      if (i === 0) fail(`${where}: first section cannot have a transitionIn`);
    }

    expectedStart -= tin;
    if (s.startFrame !== expectedStart) {
      fail(`${where}: startFrame ${s.startFrame} != expected ${expectedStart}`);
    }
    expectedStart += s.durationInFrames;
    runningTotal += s.durationInFrames - tin;

    if (s.shots) {
      let cursor = 0;
      s.shots.forEach((shot, j) => {
        if (shot.startFrame !== cursor) {
          fail(`${where} shot[${j}]: startFrame ${shot.startFrame} != expected ${cursor} (shots must tile with no gaps)`);
        }
        if (!Number.isInteger(shot.durationInFrames) || shot.durationInFrames <= 0) {
          fail(`${where} shot[${j}]: durationInFrames must be a positive integer, got ${shot.durationInFrames}`);
        }
        if (!shot.src) fail(`${where} shot[${j}]: missing src`);
        cursor += shot.durationInFrames;
      });
      if (s.shots.length && cursor !== s.durationInFrames) {
        fail(`${where}: shots total ${cursor}f but section is ${s.durationInFrames}f (must tile exactly)`);
      }
    }
  });

  if (edl.totalFrames !== runningTotal) {
    fail(`totalFrames ${edl.totalFrames} != sum of durations minus transitions (${runningTotal})`);
  }

  return problems;
}
