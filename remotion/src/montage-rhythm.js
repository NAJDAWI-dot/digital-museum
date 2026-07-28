// Plans the montage's shots: how long each one holds, how the camera moves
// through it, and whether it arrives on a cut or a glide.
//
// The montage is about 69% of the reel's runtime and every shot in it was
// exactly 3.5 seconds long, on one continuous dolly, for the whole stretch.
// That is the single biggest reason the reel reads as generated rather than
// edited: nothing in it ever decides anything.
//
// Shot lengths are drawn in whole beats. Cutting on every beat would be 90
// cuts over 42 seconds — a music video, on still photographs — so the
// vocabulary is 2 to 8 beats, chosen against the music's energy: busier
// passages get shorter shots, quiet ones get room to breathe.

/** Shot lengths worth using, in beats. Deliberately includes 3 and 6 — an
 * edit built only from powers of two lands on the same subdivisions forever
 * and starts to feel like a metronome. */
const BEAT_OPTIONS = [2, 3, 4, 6, 8];

/** Camera moves. Symbols only: what each one actually looks like belongs to
 * the composition, so the geometry can be retuned without rebuilding EDLs. */
export const MOVES = ['dolly', 'push', 'pull', 'lateral', 'hold'];

/** Which moves suit which energy. A hold at peak intensity is a statement;
 * a hold in a quiet passage is just a stall. */
const MOVES_BY_ENERGY = {
  low: ['dolly', 'pull', 'lateral'],
  mid: ['dolly', 'push', 'lateral'],
  high: ['push', 'hold', 'lateral'],
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Energy at a point inside the montage, from the beat map's 0..1 curve. */
function energyAtFrame(beatMap, fps, frame) {
  const curve = beatMap?.energy?.normalized;
  if (!curve?.length) return 0.5;
  const hop = beatMap.energy.hopSeconds || 0.1;
  const i = clamp(Math.round(frame / fps / hop), 0, curve.length - 1);
  return curve[i];
}

/** Beat frame positions that fall inside [startFrame, endFrame). */
function beatsWithin(beatMap, fps, startFrame, endFrame) {
  if (!beatMap?.grid?.beats?.length) return [];
  const offset = beatMap.syncOffsetSeconds || 0;
  return beatMap.grid.beats
    .map(t => Math.round((t + offset) * fps))
    .filter(f => f >= startFrame && f < endFrame);
}

/**
 * Plans the montage.
 *
 * `shots` is the raw photo list; the result carries a duration, a move, and a
 * cut type per shot, tiling `durationInFrames` exactly. Without a usable beat
 * grid it returns an even split and the original continuous glide, which is
 * the previous behaviour.
 */
export function planMontage(shots, {
  beatMap,
  fps,
  startFrame,
  durationInFrames,
  rng,
  punchIns = true,
}) {
  if (shots.length === 0) return [];

  const beats = beatsWithin(beatMap, fps, startFrame, startFrame + durationInFrames)
    .map(f => f - startFrame);
  const beatLocked = beats.length >= shots.length * 2;

  if (!beatLocked) return planEvenly(shots, durationInFrames);

  // Aim for roughly the whole section, but let the beat vocabulary decide the
  // actual lengths — then reconcile at the end so it tiles exactly.
  const plan = [];
  let beatCursor = 0;

  shots.forEach((shot, index) => {
    const remainingShots = shots.length - index;
    const remainingBeats = beats.length - beatCursor;
    const fair = remainingBeats / remainingShots;

    const frameGuess = beats[clamp(Math.round(beatCursor), 0, beats.length - 1)] ?? 0;
    const energy = energyAtFrame(beatMap, fps, startFrame + frameGuess);

    // Busier music, shorter shots. The scaling is gentle: energy moves the
    // target by about a third either way rather than swinging between
    // extremes, so the montage still has a recognisable pulse.
    const target = fair * (1.25 - energy * 0.5);
    const options = BEAT_OPTIONS.filter(b => b <= Math.max(2, remainingBeats - (remainingShots - 1) * 2));
    const pool = options.length ? options : [2];
    let chosen = pool.reduce((best, b) => (Math.abs(b - target) < Math.abs(best - target) ? b : best), pool[0]);

    // Avoid three identical lengths running — evenness is what we're escaping.
    const lastTwo = plan.slice(-2).map(p => p.beats);
    if (lastTwo.length === 2 && lastTwo[0] === chosen && lastTwo[1] === chosen) {
      const alt = pool.filter(b => b !== chosen);
      if (alt.length) chosen = rng ? rng.pick(alt) : alt[0];
    }

    // plateIndex is the photograph's position in the corridor, which is not
    // the shot's position in the edit: a punch-in is a second shot of the
    // same plate, so the camera returns to a station it has already visited.
    plan.push({ shot, index, plateIndex: index, beats: chosen, energy });
    beatCursor += chosen;
  });

  // Carve punch-ins out of the longer shots.
  //
  // A punch-in has to be *made*, not waited for. Left alone the planner
  // spreads beats fairly evenly — with sixty beats across twelve photos
  // nothing naturally comes out at two or three beats, so a rule that only
  // fires on an already-short shot never fires at all. Splitting an eight-beat
  // shot into six plus two gives the same photograph a second, tighter look
  // arriving on a hard cut, which is the cheapest thing here that reads as
  // someone having edited it.
  const expanded = [];
  for (const entry of plan) {
    const splittable = punchIns && entry.beats >= 6;
    if (splittable && (rng ? rng.chance(0.45) : false)) {
      expanded.push({ ...entry, beats: entry.beats - 2 });
      expanded.push({ ...entry, beats: 2, isPunchIn: true });
    } else {
      expanded.push(entry);
    }
  }
  expanded.forEach((entry, i) => { entry.index = i; });

  // Convert beat counts into frame boundaries on the actual grid, so every
  // shot change lands on a beat rather than near one.
  let cursorBeat = 0;
  const withFrames = expanded.map((entry, i) => {
    const startBeat = cursorBeat;
    cursorBeat = Math.min(beats.length - 1, cursorBeat + entry.beats);
    const isLast = i === expanded.length - 1;
    const shotStart = beats[clamp(startBeat, 0, beats.length - 1)] ?? 0;
    const shotEnd = isLast ? durationInFrames : (beats[clamp(cursorBeat, 0, beats.length - 1)] ?? durationInFrames);
    return { ...entry, startFrame: shotStart, endFrame: shotEnd };
  });

  // Reconcile: the first shot starts at 0, the last ends at the section end,
  // and no shot is shorter than the point where a photo stops registering.
  const MIN_SHOT_FRAMES = Math.round(fps * 0.6);
  const out = [];
  for (let i = 0; i < withFrames.length; i++) {
    const start = i === 0 ? 0 : out[i - 1].startFrame + out[i - 1].durationInFrames;
    const rawEnd = i === withFrames.length - 1 ? durationInFrames : withFrames[i].endFrame;
    const duration = Math.max(MIN_SHOT_FRAMES, rawEnd - start);
    out.push({ ...withFrames[i], startFrame: start, durationInFrames: duration });
  }

  // Clamping above can overrun the section; trim from the end so the total is
  // exact. verify-edl checks this, but it should never have to.
  let total = out.reduce((t, s) => t + s.durationInFrames, 0);
  let i = out.length - 1;
  while (total > durationInFrames && i >= 0) {
    const shrinkBy = Math.min(total - durationInFrames, out[i].durationInFrames - MIN_SHOT_FRAMES);
    out[i].durationInFrames -= shrinkBy;
    total -= shrinkBy;
    i--;
  }
  if (total < durationInFrames) out[out.length - 1].durationInFrames += durationInFrames - total;

  let cursor = 0;
  for (const s of out) {
    s.startFrame = cursor;
    cursor += s.durationInFrames;
  }

  return assignMoves(out, { rng, punchIns, beatLocked: true });
}

/** The previous behaviour: equal dwell, continuous glide, no cuts. */
function planEvenly(shots, durationInFrames) {
  const base = Math.floor(durationInFrames / shots.length);
  let remainder = durationInFrames - base * shots.length;
  let cursor = 0;
  return shots.map((shot, index) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    const durationInFrames2 = base + extra;
    const entry = {
      shot,
      index,
      beats: null,
      plateIndex: index,
      startFrame: cursor,
      durationInFrames: durationInFrames2,
      move: 'dolly',
      cutIn: 'soft',
      framing: 'wide',
      isPunchIn: false,
    };
    cursor += durationInFrames2;
    return entry;
  });
}

/** Chooses a camera move and an arrival style per shot.
 *
 * Hard cuts only happen *within* a project's own run of photos. Cutting
 * between two different projects would drop the viewer somewhere new with no
 * warning; gliding there keeps the corridor legible as one room. */
function assignMoves(plan, { rng, punchIns, beatLocked }) {
  return plan.map((entry, i) => {
    const prev = plan[i - 1];
    const sameProject = prev && prev.shot.project === entry.shot.project;
    const band = entry.energy > 0.66 ? 'high' : entry.energy > 0.33 ? 'mid' : 'low';
    const options = MOVES_BY_ENERGY[band];

    let move = rng ? rng.pick(options) : options[0];
    // Two identical moves running reads as one long move, which defeats the
    // point of having cut at all.
    if (prev && prev.move === move) {
      const alt = options.filter(m => m !== move);
      if (alt.length) move = rng ? rng.pick(alt) : alt[0];
    }

    // Punch-ins were already carved out of longer shots during planning; this
    // just gives them their look. They hold (the photo is the point, not the
    // move) and always arrive on a hard cut — a punch-in that glides in is
    // just a zoom.
    const isPunchIn = Boolean(punchIns && entry.isPunchIn);

    return {
      ...entry,
      move: isPunchIn ? 'hold' : move,
      // Cut within a project's own run of photos; glide when arriving at a
      // new project, so the corridor stays legible as one room.
      cutIn: isPunchIn || (beatLocked && sameProject) ? 'hard' : 'soft',
      framing: isPunchIn ? 'tight' : 'wide',
      isPunchIn,
    };
  });
}
