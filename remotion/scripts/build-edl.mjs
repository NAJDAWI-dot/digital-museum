// Builds edl.json — the reel's cut, as data — from the current reel data.
//
// Runs before the render, after select-score (which decides the music) and
// before `remotion render`. Right now it emits the same fixed cut the
// composition has always rendered; the point of the exercise is that the cut
// is now a build artifact rather than a set of constants baked into JSX, so a
// later stage can decide it from the music instead.
//
// This script never fails the render. On any problem it writes the fallback
// EDL, which is today's cut exactly — so the worst case is the reel that
// would have rendered anyway. Same philosophy as agent-edit.mjs.
//
// Usage: node scripts/build-edl.mjs
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { reelData } from '../src/data.js';
import { buildFallbackEdl, collectEdlProblems } from '../src/edl-schema.js';
import renderSettings from '../render-settings.json' with { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));
const EDL_PATH = join(__dirname, '..', 'edl.json');
const BEAT_MAP_PATH = join(__dirname, '..', 'beat-map.json');

/** The beat map is optional by design. Without it the cut is still built,
 * just not locked to anything — which is the same outcome as a track whose
 * analysis came back unusable. */
function loadBeatMap() {
  if (!existsSync(BEAT_MAP_PATH)) return null;
  try {
    return JSON.parse(readFileSync(BEAT_MAP_PATH, 'utf8'));
  } catch (err) {
    console.warn(`[build-edl] ignoring unreadable beat-map.json: ${err.message}`);
    return null;
  }
}

function write(edl) {
  writeFileSync(EDL_PATH, JSON.stringify(edl, null, 2) + '\n');
}

/** One seed per render, shared with select-score.
 *
 * select-score runs first and records the seed it used in beat-map.json, so
 * taking it from there means a single number reproduces the whole render —
 * the track, the window, the section order and the transitions. Two
 * independent seeds would make "replay this cut" only half true. An explicit
 * --seed still wins, for deliberately re-cutting the same music. */
function resolveSeed(beatMap) {
  const fromArg = process.argv.find(a => a.startsWith('--seed='))?.slice('--seed='.length);
  const raw = fromArg ?? process.env.REEL_SEED;
  if (raw != null && raw !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return Math.floor(parsed) >>> 0;
    console.warn(`[build-edl] ignoring unparseable seed "${raw}"`);
  }
  if (Number.isFinite(beatMap?.seed)) return beatMap.seed >>> 0;
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}

async function main() {
  const fps = renderSettings.fps ?? 60;
  const beatMapEarly = loadBeatMap();
  const seed = resolveSeed(beatMapEarly);
  // 'varied' rather than 'fixed': the section order, section lengths and
  // transitions are chosen per render from this seed. The fallback path
  // (no seed) still produces the original fixed cut.
  const edl = buildFallbackEdl(reelData, { fps, mode: 'varied', seed, beatMap: beatMapEarly });

  // Validate what we just produced rather than trusting it. If the builder
  // itself is wrong, that is exactly the case where writing the file anyway
  // would be worst.
  const problems = collectEdlProblems(edl, { fps, data: reelData });
  if (problems.length > 0) {
    console.error('[build-edl] refusing to write an inconsistent EDL:');
    for (const p of problems) console.error('  - ' + p);
    process.exitCode = 1;
    return;
  }

  write(edl);
  const secs = edl.sections
    .map(s => (s.transitionIn ? `-[${s.transitionIn.type}]-> ` : '') + s.id)
    .join(' ');
  console.log(
    `[build-edl] ${edl.sections.length} sections, ${edl.totalFrames} frames ` +
    `(${(edl.totalFrames / fps).toFixed(1)}s @ ${fps}fps), mode=${edl.mode}, seed=${edl.seed}`
  );
  console.log(`[build-edl] ${secs}`);
  if (edl.music) {
    const err = edl.maxSnapErrorFrames;
    const tempo = Number.isFinite(edl.music.bpm) ? `@ ${edl.music.bpm.toFixed(2)}bpm ` : '';
    console.log(
      `[build-edl] music: ${edl.music.track} ${tempo}(quality=${edl.music.quality})` +
      (err == null ? ', not beat-locked' : `, cuts land within ${err} frame(s) of a bar line`)
    );
  }
  console.log(`[build-edl] replay this cut with: npm run build-edl -- --seed=${edl.seed}`);
}

main().catch((err) => {
  // Belt-and-suspenders: an unexpected bug here must not fail the render.
  console.error('[build-edl] unexpected error, leaving any existing EDL in place:', err.message);
});
