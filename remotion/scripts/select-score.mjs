// Picks a random royalty-free cinematic track (and a random ~100s window
// within it) from music/cinematic/, shapes it with a fade in/out and a
// loudness-normalize pass for consistent levels across differently
// mastered source tracks, and writes the result to public/audio/theme.mp3.
//
// Runs before every render (like fetch-live-stats.mjs) so each regenerated
// reel gets a different track and a different part of it — Remotion
// compositions must render deterministically frame-by-frame, so this
// randomness has to happen here, before the render, not inside the
// composition itself (Math.random() inside a Remotion component would
// make the same frame render differently depending on render order).
//
// Usage: node scripts/select-score.mjs
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MUSIC_DIR = join(__dirname, '..', 'music', 'cinematic');
const OUT_DIR = join(__dirname, '..', '..', 'public', 'audio');
const OUT_PATH = join(OUT_DIR, 'theme.mp3');

const EXTRACT_SECONDS = 100; // comfortably longer than any realistic reel length
const FADE_SECONDS = 3;

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

const chosen = tracks[Math.floor(Math.random() * tracks.length)];
const chosenPath = join(MUSIC_DIR, chosen);
const duration = probeDuration(chosenPath);
if (!duration) {
  throw new Error(`Could not read duration of ${chosen}`);
}

const maxStart = Math.max(0, duration - EXTRACT_SECONDS);
const startAt = Math.random() * maxStart;
const clipLength = Math.min(EXTRACT_SECONDS, duration - startAt);

mkdirSync(OUT_DIR, { recursive: true });

const fadeOutStart = Math.max(0, clipLength - FADE_SECONDS);
const filter = `afade=t=in:st=0:d=${FADE_SECONDS},afade=t=out:st=${fadeOutStart.toFixed(2)}:d=${FADE_SECONDS},loudnorm=I=-16:TP=-1.0:LRA=11`;

execFileSync(ffmpegPath, [
  '-y',
  '-ss', startAt.toFixed(2),
  '-t', clipLength.toFixed(2),
  '-i', chosenPath,
  '-af', filter,
  '-ac', '2',
  '-ar', '44100',
  '-b:a', '192k',
  OUT_PATH,
], { stdio: 'inherit' });

console.log(`Selected "${chosen}" starting at ${startAt.toFixed(1)}s (${clipLength.toFixed(1)}s clip) -> ${OUT_PATH}`);
