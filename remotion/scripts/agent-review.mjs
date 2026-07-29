// agent-review.mjs — the "professional video editing agent" QA pass. Runs
// after both `remotion render` calls and web-encode.mjs, before the result
// is publishable. Samples still frames from the rendered 16:9 master at
// slide-boundary timestamps and asks Claude (via a headless, non-interactive
// Claude Code CLI invocation — same free, already-logged-in approach as
// agent-edit.mjs, no metered API key) for a pass/fail read — legibility,
// broken/stretched images, empty slides, letterboxing, "would a professional
// ship this."
//
// Advisory only: this never blocks or auto-gates Publish (that stays a
// human decision in the Control Station) and — like agent-edit.mjs — must
// never fail the render if the CLI is unavailable. On any error it writes
// {status: "skipped"} and exits 0.
//
// Where to sample comes from edl.json — the same cut the renderer used —
// so the frames handed to the reviewer are the frames that were rendered.
// This script used to keep its own copy of every duration constant plus a
// re-implementation of the showcase-selection and shot-count logic, kept in
// sync by hand. That copy could only ever be wrong quietly: the reviewer
// would sample mid-transition, or from the wrong slide entirely, and still
// return a confident verdict about it.
//
// Usage: node scripts/agent-review.mjs
// Requires: the `claude` CLI on PATH and already logged in — same as
// agent-edit.mjs.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { readRenderSettings } from '../control-station/lib/config.mjs';

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const REMOTION_DIR = join(__dirname, '..');
const OUT_DIR = join(REMOTION_DIR, 'out');
const MASTER_PATH = join(OUT_DIR, 'highlights.mp4');
const FRAMES_DIR = join(OUT_DIR, 'review-frames');
const OUT_PATH = join(OUT_DIR, 'agent-review.json');

const CLI_TIMEOUT_MS = 180_000;

const EDL_PATH = join(__dirname, '..', 'edl.json');

// The montage is most of the runtime and the most likely place for a broken
// image, so it gets several samples where every other section gets one.
const MONTAGE_SAMPLES = 4;

function writeReport(report) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 2));
}

function skip(reason) {
  console.warn(`agent-review: skipping (${reason}).`);
  writeReport({ status: 'skipped', reason });
}

function extractJson(text) {
  const trimmed = (text || '').trim();
  try { return JSON.parse(trimmed); } catch { /* fall through */ }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch { /* fall through */ } }
  const braced = trimmed.match(/\{[\s\S]*\}/);
  if (braced) { try { return JSON.parse(braced[0]); } catch { /* fall through */ } }
  return null;
}

async function runClaudeHeadless(prompt, addDirs) {
  const args = ['-p', prompt, '--output-format', 'json', '--permission-mode', 'bypassPermissions', '--allowedTools', 'Read'];
  for (const dir of addDirs) args.push('--add-dir', dir);
  const { stdout } = await execFileAsync('claude', args, {
    cwd: REMOTION_DIR,
    timeout: CLI_TIMEOUT_MS,
    maxBuffer: 20 * 1024 * 1024,
  });
  const outer = JSON.parse(stdout);
  if (outer.is_error) throw new Error(typeof outer.result === 'string' ? outer.result : 'claude CLI reported an error');
  return typeof outer.result === 'string' ? outer.result : JSON.stringify(outer.result);
}

async function main() {
  if (!existsSync(MASTER_PATH)) return skip(`rendered master not found at ${MASTER_PATH}`);

  let edl;
  try {
    edl = JSON.parse(readFileSync(EDL_PATH, 'utf8'));
  } catch (err) {
    return skip(`could not read edl.json (${err.message}) — nothing to sample against`);
  }
  if (!Array.isArray(edl.sections) || edl.sections.length === 0) {
    return skip('edl.json has no sections');
  }

  const fps = edl.fps || readRenderSettings().fps || 60;

  // Sample from the middle of each section, away from the transitions at its
  // edges, so the reviewer judges settled frames rather than motion.
  const samplePoints = [];
  for (const section of edl.sections) {
    const n = section.id === 'montage' ? Math.min(MONTAGE_SAMPLES, section.shots?.length || 1) : 1;
    for (let i = 0; i < n; i++) {
      const fraction = (i + 0.5) / n;
      const frame = section.startFrame + section.durationInFrames * fraction;
      samplePoints.push({
        label: n > 1 ? `${section.id}-${i + 1}` : section.id,
        timestamp: Math.max(0, frame / fps),
      });
    }
  }

  mkdirSync(FRAMES_DIR, { recursive: true });
  const frameFiles = [];
  for (const point of samplePoints) {
    const outFile = join(FRAMES_DIR, `${point.label}.jpg`);
    try {
      execFileSync(ffmpegPath, [
        '-y', '-ss', point.timestamp.toFixed(2), '-i', MASTER_PATH,
        '-frames:v', '1', '-q:v', '2', outFile,
      ], { stdio: 'pipe' });
      if (existsSync(outFile)) frameFiles.push({ ...point, path: outFile });
    } catch (e) {
      console.warn(`agent-review: could not extract frame for ${point.label}:`, e.message);
    }
  }

  if (frameFiles.length === 0) return skip('could not extract any sample frames');

  const frameRefs = frameFiles.map(f => `- ${f.path}  (slide: "${f.label}", ~${f.timestamp.toFixed(1)}s into the reel)`).join('\n');

  const briefText = `You are doing a final QA pass on a rendered ~90 second portfolio highlights reel before it's shown to a human for approval.

Use the Read tool to look at these still frames, sampled from the middle of each slide/section of the actual rendered video (not transitions, so don't flag normal mid-transition motion blur — you won't see any):
${frameRefs}

For each frame, check: is any text legible and not cut off or overflowing its container? Are images sharp, not stretched, not broken/black/placeholder? Does the slide look intentional and complete, not empty or half-populated? Does the framing/letterboxing look correct for a 16:9 cinematic video?

Give an overall verdict: "pass" (ready to publish), "warn" (minor issues, still publishable), or "fail" (a real problem, shouldn't ship as-is). List specific issues per frame if you find any, each with a severity. Be a working professional editor, not a nitpicker — only flag things a real visitor would notice or that look broken, not stylistic taste.

Respond with ONLY a single JSON object — no markdown code fences, no other text before or after — matching exactly this shape:
{
  "verdict": "pass" | "warn" | "fail",
  "checks": [ { "slide": "...", "timestamp": 12.4, "issue": "...", "severity": "low" | "warn" | "high" } ],
  "summary": "..."
}`;

  let resultText;
  try {
    resultText = await runClaudeHeadless(briefText, [FRAMES_DIR]);
  } catch (e) {
    return skip(`claude CLI invocation failed: ${e.message}`);
  }

  const review = extractJson(resultText);
  if (!review) return skip('could not parse a JSON review from the model output');

  writeReport({
    status: 'reviewed',
    engine: 'claude-code-cli',
    verdict: review.verdict || 'warn',
    checks: Array.isArray(review.checks) ? review.checks : [],
    summary: review.summary || '',
    framesSampled: frameFiles.map(f => ({ label: f.label, timestamp: f.timestamp })),
  });

  console.log(`agent-review: verdict = ${review.verdict}, ${(review.checks || []).length} note(s)`);
}

main().catch(e => {
  console.warn('agent-review: unexpected error:', e);
  try { writeReport({ status: 'skipped', reason: `unexpected error: ${e.message}` }); } catch { /* out dir issue */ }
});
