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
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { reelData } from '../src/data.js';
import { buildFallbackEdl, collectEdlProblems } from '../src/edl-schema.js';
import renderSettings from '../render-settings.json' with { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));
const EDL_PATH = join(__dirname, '..', 'edl.json');

function write(edl) {
  writeFileSync(EDL_PATH, JSON.stringify(edl, null, 2) + '\n');
}

async function main() {
  const fps = renderSettings.fps ?? 60;
  // 'fixed' rather than 'fallback-fixed': the cut is the same today, but this
  // one was built on purpose. The distinction matters when reading a render
  // log to work out whether the intended edit actually made it in.
  const edl = buildFallbackEdl(reelData, { fps, mode: 'fixed' });

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
  const secs = edl.sections.map(s => s.id).join(' -> ');
  console.log(
    `[build-edl] ${edl.sections.length} sections, ${edl.totalFrames} frames ` +
    `(${(edl.totalFrames / fps).toFixed(1)}s @ ${fps}fps), mode=${edl.mode}`
  );
  console.log(`[build-edl] ${secs}`);
}

main().catch((err) => {
  // Belt-and-suspenders: an unexpected bug here must not fail the render.
  console.error('[build-edl] unexpected error, leaving any existing EDL in place:', err.message);
});
