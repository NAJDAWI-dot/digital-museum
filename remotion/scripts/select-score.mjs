// Chooses the track and the window of it the reel is cut against, writes
// public/audio/theme.mp3, and emits beat-map.json describing where the
// beats, bars and phrases fall inside that clip.
//
// Two things used to be random here that shouldn't have been. The window was
// `Math.random() * (duration - 100)`, so a reel could be scored by the
// quietest ninety seconds of a five-minute track, starting mid-phrase. And
// the length was a flat 100s on the assumption that was longer than any
// reel, which wasn't true and shipped reels whose music ran out.
//
// Now: the reel's natural length is rounded to a whole number of bars, a
// window of exactly that length is chosen starting on a downbeat and scored
// on its musical arc, and the seed that picked it is recorded so the choice
// can be replayed.
//
// Usage: node scripts/select-score.mjs [--seed=N]
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { reelData } from '../src/data.js';
import { calculateTotalFrames } from '../src/reel-timing.js';
import { createRng } from '../src/rng.js';
import { loadAnalysis, chooseWindow, quantizeToBars, sliceToWindow, emptyBeatMap } from './lib/beat-map.mjs';
import { onsetEnvelope } from './lib/audio-analysis.mjs';
import renderSettings from '../render-settings.json' with { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));
const MUSIC_DIR = join(__dirname, '..', 'music', 'cinematic');
const ANALYSIS_DIR = join(__dirname, '..', 'music', 'analysis');
const CONFIG_PATH = join(__dirname, '..', 'reel-config.json');
const BEAT_MAP_PATH = join(__dirname, '..', 'beat-map.json');
const OUT_DIR = join(__dirname, '..', '..', 'public', 'audio');
const OUT_PATH = join(OUT_DIR, 'theme.mp3');

// A little more audio than the reel needs, so the final frame never reaches
// past the end of the file. The reel's own fade-out lives in the composition
// (scoreVolume), which is the only place that knows the real duration.
const TAIL_MARGIN_SECONDS = 1.5;
const MEASURE_SAMPLE_RATE = 22050;

function resolveSeed() {
  const fromArg = process.argv.find(a => a.startsWith('--seed='))?.slice('--seed='.length);
  const raw = fromArg ?? process.env.REEL_SEED;
  if (raw != null && raw !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return Math.floor(parsed) >>> 0;
  }
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}

function probeDuration(filePath) {
  try {
    execFileSync(ffmpegPath, ['-i', filePath], { stdio: 'pipe' });
    return null; // unreachable — ffmpeg with no output always exits nonzero
  } catch (e) {
    const m = (e.stderr?.toString() || '').match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
  }
}

/** How far the written mp3's beats sit from where the beat map says they are.
 *
 * Cutting the source, normalising loudness and re-encoding to mp3 can shift
 * the audio by a frame or two, and a beat map that is confidently one frame
 * wrong is worse than one that admits it. Rather than assume an encoder
 * delay, decode what was actually written and find the offset that best
 * lines its onsets up with the expected beat comb. */
function measureSyncOffset(clipPath, beats) {
  if (!beats.length) return 0;
  try {
    const raw = execFileSync(
      ffmpegPath,
      ['-v', 'error', '-i', clipPath, '-f', 'f32le', '-ac', '1', '-ar', String(MEASURE_SAMPLE_RATE), '-'],
      { maxBuffer: 1024 * 1024 * 256 },
    );
    const samples = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
    const { envelope, hopSeconds } = onsetEnvelope(samples, MEASURE_SAMPLE_RATE);

    // Try shifts of +/- a quarter second and keep whichever lines the comb up
    // with the most onset energy. Resolution is one hop (~12ms), which is
    // below a single frame at 60fps — so this is really a check that nothing
    // has shifted materially, not a precise measurement. In practice it comes
    // back at the grid point nearest zero for every track, i.e. the encode
    // preserves timing to within less than a frame.
    const maxShift = 0.25;
    const step = hopSeconds;
    let bestShift = 0;
    let bestScore = -Infinity;
    for (let shift = -maxShift; shift <= maxShift; shift += step) {
      let acc = 0;
      for (const b of beats) {
        const idx = Math.round((b + shift) / hopSeconds);
        if (idx >= 0 && idx < envelope.length) acc += envelope[idx];
      }
      if (acc > bestScore) {
        bestScore = acc;
        bestShift = shift;
      }
    }
    return +bestShift.toFixed(4);
  } catch {
    return 0;
  }
}

const tracks = readdirSync(MUSIC_DIR).filter(f => f.toLowerCase().endsWith('.mp3'));
if (tracks.length === 0) throw new Error(`No .mp3 files found in ${MUSIC_DIR}`);

const seed = resolveSeed();
const rng = createRng(seed);

const fps = renderSettings.fps ?? 60;
const naturalSeconds = calculateTotalFrames(reelData) / fps;

const durations = new Map();
for (const track of tracks) {
  const d = probeDuration(join(MUSIC_DIR, track));
  if (d) durations.set(track, d);
}
if (durations.size === 0) throw new Error('Could not read the duration of any track in music/cinematic/');

let pinnedTrack = null;
try {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  if (config.track && config.track !== 'random' && tracks.includes(config.track)) {
    pinnedTrack = config.track;
  }
} catch { /* no config — random */ }

/** Everything needed to cut against one candidate track: its analysis (if
 * any), the bar-quantized reel length, and the window chosen inside it. */
function planFor(track) {
  const duration = durations.get(track);
  if (!duration) return null;

  const analysis = loadAnalysis(ANALYSIS_DIR, track);
  if (!analysis || analysis.quality?.level === 'none') {
    const required = naturalSeconds + TAIL_MARGIN_SECONDS;
    if (duration < required) return null;
    return {
      track, analysis: null, reelSeconds: naturalSeconds,
      clipSeconds: required, startT: rng.range(0, duration - required), window: null,
    };
  }

  const { seconds: reelSeconds } = quantizeToBars(naturalSeconds, analysis);
  const clipSeconds = reelSeconds + TAIL_MARGIN_SECONDS;
  if (duration < clipSeconds) return null;

  const window = chooseWindow(analysis, clipSeconds, rng);
  if (!window) return null;
  return { track, analysis, reelSeconds, clipSeconds, startT: window.startT, window };
}

const eligible = tracks.map(planFor).filter(Boolean);
if (eligible.length === 0) {
  const longest = Math.max(...durations.values());
  throw new Error(
    `No track is long enough for this reel.\n` +
    `  Reel is ${naturalSeconds.toFixed(1)}s; need >= ${(naturalSeconds + TAIL_MARGIN_SECONDS).toFixed(1)}s of audio.\n` +
    `  Longest available track is ${longest.toFixed(1)}s.\n` +
    `  Fix by lowering photosPerProject in render-settings.json (currently ` +
    `${reelData.photosPerProject}), capping maxShowcaseProjects, or adding a longer track.`
  );
}

let plan = pinnedTrack ? eligible.find(p => p.track === pinnedTrack) : null;
if (pinnedTrack && !plan) {
  console.warn(
    `[select-score] Pinned track "${pinnedTrack}" can't carry a ${naturalSeconds.toFixed(1)}s reel ` +
    `(it is ${durations.get(pinnedTrack)?.toFixed(1)}s) — falling back to another track.`
  );
}
if (!plan) plan = rng.pick(eligible);

mkdirSync(OUT_DIR, { recursive: true });

// Loudness-normalize only. Fades are deliberately NOT baked in: the
// composition applies its own against the real frame count, and a baked
// fade-in would also flatten the transients the analysis depends on.
execFileSync(ffmpegPath, [
  '-y',
  '-ss', plan.startT.toFixed(4),
  '-t', plan.clipSeconds.toFixed(4),
  '-i', join(MUSIC_DIR, plan.track),
  '-af', 'loudnorm=I=-16:TP=-1.0:LRA=11',
  '-ac', '2', '-ar', '44100', '-b:a', '192k',
  OUT_PATH,
], { stdio: 'pipe' });

let beatMap;
if (plan.analysis) {
  beatMap = sliceToWindow(plan.analysis, plan.startT, plan.clipSeconds, {
    windowScore: +plan.window.score.toFixed(3),
    windowRank: plan.window.rank,
    candidatesConsidered: plan.window.candidatesConsidered,
    downbeatAligned: true,
  });
  beatMap.seed = seed;
  beatMap.reelSeconds = +plan.reelSeconds.toFixed(3);
  beatMap.syncOffsetSeconds = measureSyncOffset(OUT_PATH, beatMap.grid.beats);
} else {
  beatMap = emptyBeatMap(plan.track, plan.startT, plan.clipSeconds, 'no usable analysis for this track');
  beatMap.seed = seed;
  beatMap.reelSeconds = +plan.reelSeconds.toFixed(3);
  beatMap.syncOffsetSeconds = 0;
}

writeFileSync(BEAT_MAP_PATH, JSON.stringify(beatMap, null, 2) + '\n');

const t = beatMap.tempo;
console.log(
  `[select-score] "${plan.track}" @ ${plan.startT.toFixed(1)}s, ${plan.clipSeconds.toFixed(1)}s clip ` +
  `for a ${plan.reelSeconds.toFixed(1)}s reel (seed=${seed})`
);
if (t) {
  console.log(
    `[select-score] ${t.bpm.toFixed(2)}bpm, bar ${t.barSeconds.toFixed(3)}s — ` +
    `${beatMap.grid.beats.length} beats, ${beatMap.grid.downbeatIndices.length} bars, ` +
    `${beatMap.grid.phraseIndices.length} phrases, quality=${beatMap.quality.level}`
  );
  console.log(
    `[select-score] window rank ${plan.window.rank}/${plan.window.candidatesConsidered} ` +
    `(score ${plan.window.score.toFixed(2)}), sync offset ${(beatMap.syncOffsetSeconds * 1000).toFixed(0)}ms`
  );
} else {
  console.log('[select-score] no beat grid for this track — the cut will not be beat-locked');
}
