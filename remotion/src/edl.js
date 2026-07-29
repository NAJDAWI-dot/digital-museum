// The composition's view of the EDL: load it, check it, and fall back to
// today's fixed cut if anything is off.
//
// Falling back is not a degraded mode — buildFallbackEdl produces exactly the
// cut this reel has always rendered — so a missing, stale, or malformed
// edl.json can only make the reel boring, never broken.
import rawEdl from '../edl.json' with { type: 'json' };
import { reelData } from './data.js';
import { FPS } from './theme.js';
import { validateEdl, buildFallbackEdl, collectEdlProblems } from './edl-schema.js';

const validated = validateEdl(rawEdl, { fps: FPS, data: reelData });

if (!validated) {
  // Loud, because this surfaces in the Control Station's live render log and
  // in CI output, and a silently-ignored EDL is how a stale cut ships.
  const problems = collectEdlProblems(rawEdl, { fps: FPS, data: reelData });
  console.warn(
    '[edl] edl.json rejected, falling back to the fixed cut:\n' +
    problems.map(p => '  - ' + p).join('\n')
  );
}

export const EDL = validated ?? buildFallbackEdl(reelData, { fps: FPS });
export const isFallback = !validated;
