// Checks edl.json against the invariants that, when broken, either crash the
// render or silently produce a wrong video. Runs between build-edl and
// `remotion render`, where it costs a second; the alternative is finding out
// after a GPU render that a transition was longer than its sequence.
//
// Exits non-zero on violation, so it can gate a pipeline step.
//
// Usage: node scripts/verify-edl.mjs
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { reelData } from '../src/data.js';
import { collectEdlProblems } from '../src/edl-schema.js';
import renderSettings from '../render-settings.json' with { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));
const EDL_PATH = join(__dirname, '..', 'edl.json');
const PUBLIC_DIR = join(__dirname, '..', '..', 'public');
const AUDIO_PATH = join(PUBLIC_DIR, 'audio', 'theme.mp3');

const problems = [];
const notes = [];

function probeDuration(filePath) {
  try {
    execFileSync(ffmpegPath, ['-i', filePath], { stdio: 'pipe' });
    return null;
  } catch (e) {
    const m = (e.stderr?.toString() || '').match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
  }
}

if (!existsSync(EDL_PATH)) {
  console.error('[verify-edl] no edl.json — run scripts/build-edl.mjs first');
  process.exit(1);
}

let edl;
try {
  edl = JSON.parse(readFileSync(EDL_PATH, 'utf8'));
} catch (err) {
  console.error('[verify-edl] edl.json is not valid JSON:', err.message);
  process.exit(1);
}

const fps = renderSettings.fps ?? 60;

// Structural invariants (shared with the composition's own validation, so the
// two can never disagree about what "valid" means).
problems.push(...collectEdlProblems(edl, { fps, data: reelData }));

// Every shot must point at a file that actually exists, or the montage
// renders a hole where a photo should be.
for (const section of edl.sections) {
  for (const shot of section.shots ?? []) {
    if (!shot.src) continue;
    if (/^(data:|https?:)/.test(shot.src)) continue; // inline or remote, not ours to check
    const resolved = join(PUBLIC_DIR, shot.src.replace(/^\//, ''));
    if (!existsSync(resolved)) {
      problems.push(`montage shot[${shot.index}]: src "${shot.src}" does not exist under public/`);
    }
  }
}

// The check that did not exist, and that a reel shipped without: the video
// must not outlast its own soundtrack.
if (existsSync(AUDIO_PATH)) {
  const audioSeconds = probeDuration(AUDIO_PATH);
  const reelSeconds = edl.totalFrames / fps;
  if (audioSeconds == null) {
    notes.push('could not probe theme.mp3 duration — skipping the audio-length check');
  } else if (audioSeconds < reelSeconds) {
    problems.push(
      `audio is shorter than the reel: theme.mp3 is ${audioSeconds.toFixed(2)}s but the ` +
      `reel is ${reelSeconds.toFixed(2)}s — the last ${(reelSeconds - audioSeconds).toFixed(2)}s would be silent`
    );
  } else {
    notes.push(`audio covers the reel (${audioSeconds.toFixed(2)}s vs ${reelSeconds.toFixed(2)}s, ${(audioSeconds - reelSeconds).toFixed(2)}s headroom)`);
  }
} else {
  notes.push('no theme.mp3 yet — skipping the audio-length check (run select-score first)');
}

// crossZoom between two WebGL sections exceeds the renderer's per-frame
// timeout — it scale-transforms both full-resolution canvases every frame.
// The failure arrives partway through a render that has already been running
// for many minutes, so it is worth a second of checking here.
const GPU_HEAVY = new Set(['title', 'montage', 'endCard']);
edl.sections.forEach((section, i) => {
  const prev = edl.sections[i - 1];
  if (
    section.transitionIn?.type === 'crossZoom' &&
    GPU_HEAVY.has(section.id) &&
    GPU_HEAVY.has(prev?.id)
  ) {
    problems.push(
      `section[${i}] "${section.id}": crossZoom from "${prev.id}" — both render WebGL, ` +
      `which blows the 30s per-frame render timeout. Use a dissolve here.`
    );
  }
});

// If the EDL claims to be beat-locked, hold it to that. A cut that has
// quietly stopped landing on the grid still renders fine and still says
// "beat-locked" in the logs, so this is the only thing that would notice.
if (edl.mode === 'beat-locked') {
  const errors = edl.snapErrorFrames ?? [];
  const max = edl.maxSnapErrorFrames;
  if (!errors.length) {
    problems.push('mode is beat-locked but no snap errors were recorded');
  } else if (max == null || max > 1) {
    problems.push(
      `mode is beat-locked but a cut sits ${max} frames off the nearest bar ` +
      `(per-boundary: ${JSON.stringify(errors)})`
    );
  } else {
    notes.push(`beat-locked: all ${errors.length} cuts land within ${max} frame(s) of a bar line`);
  }
}

for (const n of notes) console.log(`[verify-edl] ${n}`);

if (problems.length > 0) {
  console.error(`\n[verify-edl] ${problems.length} problem(s):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

console.log(
  `[verify-edl] OK — ${edl.sections.length} sections, ${edl.totalFrames} frames ` +
  `(${(edl.totalFrames / fps).toFixed(1)}s), mode=${edl.mode}`
);
