// Turns a committed track analysis into a beat map for one specific render:
// which window of the track to use, and where the beats, bars and phrases
// fall inside it.
//
// The window used to be `Math.random() * (duration - 100)`. A random 100
// seconds of a five-minute cinematic track lands wherever it lands — often
// mid-phrase, often on the quietest passage, and never in any particular
// relationship to the edit laid over it. Choosing it deliberately is most of
// what makes the cut feel scored rather than soundtracked.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** Reads a committed analysis, applying any manual override. The override
 * exists so a human can correct a bad detection permanently; it has to win
 * here or it may as well not exist. */
export function loadAnalysis(analysisDir, track) {
  const path = join(analysisDir, track.replace(/\.mp3$/i, '.json'));
  if (!existsSync(path)) return null;

  let analysis;
  try {
    analysis = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
  if (!analysis?.tempo?.beatSeconds) return null;

  const override = analysis.manualOverride;
  if (override) {
    if (Number.isFinite(override.bpm) && override.bpm > 0) {
      analysis.tempo.bpm = override.bpm;
      analysis.tempo.beatSeconds = 60 / override.bpm;
      analysis.tempo.barSeconds = (60 / override.bpm) * (analysis.tempo.meter || 4);
    }
    if (Number.isFinite(override.firstBeat)) analysis.grid.firstBeat = override.firstBeat;
    analysis.quality = { ...analysis.quality, level: override.level ?? analysis.quality.level };
  }
  return analysis;
}

/** Time of the nearest downbeat at or after `t`. Downbeats are every `meter`
 * beats, offset by the detected phase. */
export function downbeatsOf(analysis) {
  const { beats, downbeatPhase } = analysis.grid;
  const meter = analysis.tempo.meter || 4;
  const out = [];
  for (let i = downbeatPhase; i < beats.length; i += meter) out.push(beats[i]);
  return out;
}

/** Energy at a time, from the committed 0..1 curve. */
function energyAt(analysis, t) {
  const { hopSeconds, normalized } = analysis.energy;
  const i = Math.round(t / hopSeconds);
  if (i < 0 || i >= normalized.length) return 0;
  return normalized[i];
}

/** How well a candidate window works as the spine of a ~60 second piece.
 *
 * What a reel wants is an arc: come in somewhere restrained, build, peak
 * past the middle, and still have something left at the end. That is also
 * roughly how these tracks are written, so the scoring mostly amounts to
 * finding where the track is already doing it. */
export function scoreWindow(analysis, startT, durationT) {
  const endT = startT + durationT;
  if (endT > analysis.duration) return -Infinity;

  const samples = 24;
  const curve = [];
  for (let i = 0; i < samples; i++) {
    curve.push(energyAt(analysis, startT + (durationT * i) / (samples - 1)));
  }

  const open = curve.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
  const close = curve.slice(-4).reduce((a, b) => a + b, 0) / 4;
  const peak = Math.max(...curve);
  const peakIndex = curve.indexOf(peak) / (samples - 1);
  const mean = curve.reduce((a, b) => a + b, 0) / curve.length;

  let score = 0;

  // Room to grow: starting at full intensity leaves the edit nowhere to go.
  score += (1 - open) * 1.2;
  // Actually gets somewhere.
  score += (peak - open) * 2.0;
  // Peak in the back half, where a reel's own climax wants to be.
  score += (1 - Math.abs(peakIndex - 0.68) * 2) * 1.4;
  // Doesn't die at the end — the reel still has an end card to carry.
  score += close * 0.8;
  // Generally alive rather than a quiet passage that happens to rise.
  score += mean * 0.6;

  // A drop inside the window is a gift: it gives the edit an obvious place
  // to put its strongest moment.
  const hasDrop = (analysis.events || []).some(
    e => e.type === 'drop' && e.t > startT + durationT * 0.15 && e.t < endT - durationT * 0.1,
  );
  if (hasDrop) score += 1.5;

  return score;
}

/** Picks a window: downbeat-aligned, long enough, and the best musical arc
 * available. Ties broken by the seeded rng so repeated renders of the same
 * track don't always land identically. */
export function chooseWindow(analysis, targetSeconds, rng) {
  const candidates = downbeatsOf(analysis)
    .filter(t => t + targetSeconds <= analysis.duration)
    .map(t => ({ startT: t, score: scoreWindow(analysis, t, targetSeconds) }))
    .filter(c => Number.isFinite(c.score))
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return null;

  // Choose among the best few rather than always the single best: the
  // scoring is a heuristic, and a reel that picks a slightly different
  // window each week is the point.
  const pool = candidates.slice(0, Math.max(1, Math.min(5, Math.ceil(candidates.length * 0.1))));
  const chosen = rng ? rng.pick(pool) : pool[0];
  return {
    startT: chosen.startT,
    score: chosen.score,
    rank: candidates.indexOf(chosen) + 1,
    candidatesConsidered: candidates.length,
  };
}

/** Rounds a desired reel length to a whole number of bars, so the music ends
 * where a bar ends rather than partway through one.
 *
 * Bars, not phrases: at 110bpm a bar is 2.2s but a phrase is 17.5s, and
 * quantizing a ~60s reel to whole phrases would move it by up to nine
 * seconds. Bar alignment is what the edit actually needs; phrase alignment
 * is a preference applied to individual boundaries later. */
export function quantizeToBars(seconds, analysis) {
  const bar = analysis.tempo.barSeconds;
  if (!bar || !Number.isFinite(bar)) return { seconds, bars: null };
  const bars = Math.max(1, Math.round(seconds / bar));
  return { seconds: bars * bar, bars };
}

/** The beat map for one render: everything from the analysis, re-based so
 * t=0 is the start of the extracted clip. */
export function sliceToWindow(analysis, startT, durationT, extra = {}) {
  const endT = startT + durationT;
  const meter = analysis.tempo.meter || 4;
  const phraseBars = analysis.tempo.phraseBars || 8;

  const beats = analysis.grid.beats
    .filter(t => t >= startT - 1e-6 && t <= endT + 1e-6)
    .map(t => +(t - startT).toFixed(4));

  // Which of the retained beats are downbeats depends on where the window
  // started relative to the original phase, so recompute rather than assume.
  const firstIndex = analysis.grid.beats.findIndex(t => t >= startT - 1e-6);
  const phaseShift = ((firstIndex - analysis.grid.downbeatPhase) % meter + meter) % meter;
  const downbeatOffset = (meter - phaseShift) % meter;

  const downbeatIndices = [];
  for (let i = downbeatOffset; i < beats.length; i += meter) downbeatIndices.push(i);
  const phraseIndices = downbeatIndices.filter((_, k) => k % phraseBars === 0);

  const hop = analysis.energy.hopSeconds;
  const from = Math.max(0, Math.round(startT / hop));
  const to = Math.min(analysis.energy.normalized.length, Math.round(endT / hop));
  const normalized = analysis.energy.normalized.slice(from, to);

  const events = (analysis.events || [])
    .filter(e => e.t >= startT && e.t <= endT)
    .map(e => ({ ...e, t: +(e.t - startT).toFixed(3) }));

  return {
    version: 1,
    source: {
      track: analysis.track,
      windowStart: +startT.toFixed(3),
      windowDuration: +durationT.toFixed(3),
      ...extra,
    },
    tempo: { ...analysis.tempo },
    grid: { beats, downbeatIndices, phraseIndices },
    energy: { hopSeconds: hop, normalized },
    events,
    quality: { ...analysis.quality },
  };
}

/** A beat map that admits it has no beats — the shape stays the same so
 * consumers don't need a separate code path, they just find an empty grid
 * and a level of "none". */
export function emptyBeatMap(track, startT, durationT, reason) {
  return {
    version: 1,
    source: { track, windowStart: +startT.toFixed(3), windowDuration: +durationT.toFixed(3) },
    tempo: null,
    grid: { beats: [], downbeatIndices: [], phraseIndices: [] },
    energy: { hopSeconds: 0.1, normalized: [] },
    events: [],
    quality: { confidence: 0, level: 'none', warnings: [reason] },
  };
}
