// Picks a royalty-free cinematic track from music/cinematic/ and extracts a
// window of it long enough to cover the reel, loudness-normalized so
// differently-mastered sources sit at the same level, into
// public/audio/theme.mp3.
//
// Runs before every render (like fetch-live-stats.mjs) so each regenerated
// reel gets a different track and a different part of it — Remotion
// compositions must render deterministically frame-by-frame, so this
// randomness has to happen here, before the render, not inside the
// composition itself (Math.random() inside a Remotion component would
// make the same frame render differently depending on render order).
//
// The window is sized against the reel's ACTUAL length, computed from the
// same data and timing model the composition renders from. It used to
// extract a flat 100s on the assumption that was "comfortably longer than
// any realistic reel length" — but nothing checked, one track is only 70s,
// and the reel grows with photosPerProject (which the editing agent sets
// freely, 1-4). At photosPerProject=3 the reel is already 82s, so that
// assumption shipped a reel whose music ran out partway through, in silence.
//
// Usage: node scripts/select-score.mjs
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { reelData } from '../src/data.js';
import { calculateTotalFrames } from '../src/reel-timing.js';
import renderSettings from '../render-settings.json' with { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));
const MUSIC_DIR = join(__dirname, '..', 'music', 'cinematic');
const CONFIG_PATH = join(__dirname, '..', 'reel-config.json');
const OUT_DIR = join(__dirname, '..', '..', 'public', 'audio');
const OUT_PATH = join(OUT_DIR, 'theme.mp3');

// A little more audio than the reel needs, so the final frame never reaches
// past the end of the file. The reel's own fade-out lives in the composition
// (see scoreVolume in HighlightsReel.jsx), which is the only place that
// knows the real duration.
const TAIL_MARGIN_SECONDS = 1.5;

function parseDuration(ffmpegStderr) {
  const match = ffmpegStderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!match) return null;
  const [, h, m, s] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function probeDuration(filePath) {
  try {
    execFileSync(ffmpegPath, ['-i', filePath], { stdio: 'pipe' });
    return null; // unreachable — ffmpeg with no output always exits nonzero
  } catch (e) {
    return parseDuration(e.stderr?.toString() || '');
  }
}

const tracks = readdirSync(MUSIC_DIR).filter(f => f.toLowerCase().endsWith('.mp3'));
if (tracks.length === 0) {
  throw new Error(`No .mp3 files found in ${MUSIC_DIR}`);
}

const fps = renderSettings.fps ?? 60;
const reelSeconds = calculateTotalFrames(reelData) / fps;
const requiredSeconds = reelSeconds + TAIL_MARGIN_SECONDS;

// Probe everything up front so track choice can actually depend on length.
const durations = new Map();
for (const track of tracks) {
  const d = probeDuration(join(MUSIC_DIR, track));
  if (d) durations.set(track, d);
}
if (durations.size === 0) {
  throw new Error('Could not read the duration of any track in music/cinematic/');
}

const eligible = [...durations.entries()]
  .filter(([, d]) => d >= requiredSeconds)
  .map(([track]) => track);

if (eligible.length === 0) {
  const longest = Math.max(...durations.values());
  throw new Error(
    `No track is long enough for this reel.\n` +
    `  Reel is ${reelSeconds.toFixed(1)}s (${calculateTotalFrames(reelData)} frames @ ${fps}fps); ` +
    `need >= ${requiredSeconds.toFixed(1)}s of audio.\n` +
    `  Longest available track is ${longest.toFixed(1)}s.\n` +
    `  Fix by lowering photosPerProject in render-settings.json (currently ` +
    `${reelData.photosPerProject}), capping maxShowcaseProjects, or adding a longer track.`
  );
}

// The reel director (admin app, via reel-config.json) can pin a specific
// track; "random" (or a missing/renamed file) keeps the pick-a-different-
// track-each-render behavior.
let pinnedTrack = null;
try {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  if (config.track && config.track !== 'random' && tracks.includes(config.track)) {
    pinnedTrack = config.track;
  }
} catch { /* no config — random */ }

// A pinned track that's too short is the director's stated preference losing
// to a hard constraint. Say so loudly rather than either failing the whole
// render or silently shipping a reel that goes quiet.
if (pinnedTrack && !eligible.includes(pinnedTrack)) {
  console.warn(
    `[select-score] Pinned track "${pinnedTrack}" is ${durations.get(pinnedTrack).toFixed(1)}s, ` +
    `too short for a ${reelSeconds.toFixed(1)}s reel — falling back to a random eligible track.`
  );
  pinnedTrack = null;
}

const chosen = pinnedTrack || eligible[Math.floor(Math.random() * eligible.length)];
const chosenPath = join(MUSIC_DIR, chosen);
const duration = durations.get(chosen);

const maxStart = Math.max(0, duration - requiredSeconds);
const startAt = Math.random() * maxStart;

mkdirSync(OUT_DIR, { recursive: true });

// Loudness-normalize only. Fades are deliberately NOT baked in here: the
// composition applies its own attack/release against the real frame count
// (scoreVolume), and a second fade underneath it would double up. A baked
// fade-in also flattens exactly the transients that music analysis needs.
const filter = 'loudnorm=I=-16:TP=-1.0:LRA=11';

execFileSync(ffmpegPath, [
  '-y',
  '-ss', startAt.toFixed(2),
  '-t', requiredSeconds.toFixed(2),
  '-i', chosenPath,
  '-af', filter,
  '-ac', '2',
  '-ar', '44100',
  '-b:a', '192k',
  OUT_PATH,
], { stdio: 'inherit' });

console.log(
  `Selected "${chosen}" (${duration.toFixed(1)}s) starting at ${startAt.toFixed(1)}s — ` +
  `extracted ${requiredSeconds.toFixed(1)}s for a ${reelSeconds.toFixed(1)}s reel -> ${OUT_PATH}`
);
