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
// Section-boundary math below duplicates (rather than imports) the frame
// arithmetic in remotion/src/HighlightsReel.jsx's calculateTotalFrames and
// remotion/src/slides/ProjectsMontage.jsx's buildProjectShotList, because
// those are JSX modules meant to run through Remotion's bundler, not plain
// Node — this script only needs approximate mid-slide timestamps to sample,
// not frame-perfect accuracy, so a manually-kept-in-sync duplicate is an
// acceptable tradeoff. If you change durations.js or the montage shot-list
// logic, update the constants below to match.
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
import { INITIAL_PROJECTS, INITIAL_TIMELINE, INITIAL_TESTIMONIALS } from '../../src/data/projects.js';
import { readReelConfig, readRenderSettings } from '../control-station/lib/config.mjs';

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const REMOTION_DIR = join(__dirname, '..');
const OUT_DIR = join(REMOTION_DIR, 'out');
const MASTER_PATH = join(OUT_DIR, 'highlights.mp4');
const FRAMES_DIR = join(OUT_DIR, 'review-frames');
const OUT_PATH = join(OUT_DIR, 'agent-review.json');

const CLI_TIMEOUT_MS = 180_000;

// Mirrors remotion/src/durations.js — see the note above about why this is
// a duplicate, not an import.
const FADE_FRAMES = 40, SLIDE_FRAMES = 40, WIPE_FRAMES = 48, CROSSZOOM_FRAMES = 52;
const TITLE_FRAMES = 180, STATS_FRAMES = 240, TIMELINE_FRAMES = 240,
  VOLUNTEERING_FRAMES = 210, TESTIMONIAL_FRAMES = 240, GUESTBOOK_FRAMES = 300, END_CARD_FRAMES = 240;
const SHOT_FRAMES = 210; // mirrors ProjectsMontage.jsx's SHOT_FRAMES

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

// Mirrors data.js's showcase-project selection (starProjects pin, else
// featured-first) so sampling matches what was actually rendered.
function computeShowcaseProjects(reelConfig, renderSettings) {
  const starIds = Array.isArray(reelConfig.starProjects) && reelConfig.starProjects.length > 0
    ? reelConfig.starProjects
    : null;
  const featured = INITIAL_PROJECTS.find(p => p.featured) || INITIAL_PROJECTS[0] || null;
  const full = starIds
    ? starIds.map(id => INITIAL_PROJECTS.find(p => p.id === id)).filter(Boolean)
    : [featured, ...INITIAL_PROJECTS.filter(p => p !== featured)].filter(Boolean);
  return renderSettings.maxShowcaseProjects ? full.slice(0, renderSettings.maxShowcaseProjects) : full;
}

// Mirrors ProjectsMontage.jsx's buildProjectShotList shot COUNT (not the
// actual shot data, which this script doesn't need).
function countMontageShots(showcaseProjects, photosPerProject) {
  const cap = Math.max(1, Math.min(4, photosPerProject));
  return showcaseProjects.reduce((total, p) => {
    const extras = Math.min((p.screenshots || []).length, cap - 1);
    const shots = Math.min(cap, (p.coverImage ? 1 : 0) + extras);
    return total + Math.max(shots, 0);
  }, 0);
}

async function main() {
  if (!existsSync(MASTER_PATH)) return skip(`rendered master not found at ${MASTER_PATH}`);

  const reelConfig = readReelConfig();
  const renderSettings = readRenderSettings();
  const fps = renderSettings.fps || 60;

  const showcaseProjects = computeShowcaseProjects(reelConfig, renderSettings);
  const montageShotCount = Math.max(1, countMontageShots(showcaseProjects, renderSettings.photosPerProject));
  const showTimeline = reelConfig.sections?.timeline !== false && INITIAL_TIMELINE.length > 0;
  const showVolunteering = reelConfig.sections?.volunteering !== false;
  const featuredTestimonial = INITIAL_TESTIMONIALS.find(t => t.quote) || null;
  const showTestimonial = reelConfig.sections?.testimonial !== false && Boolean(featuredTestimonial);

  const sections = [{ name: 'title', frames: TITLE_FRAMES }];
  sections.push({ name: 'projects-montage', frames: montageShotCount * SHOT_FRAMES, transitionIn: FADE_FRAMES, sampleMultiple: Math.min(4, montageShotCount) });
  sections.push({ name: 'stats', frames: STATS_FRAMES, transitionIn: CROSSZOOM_FRAMES });
  if (showTimeline) sections.push({ name: 'timeline', frames: TIMELINE_FRAMES, transitionIn: FADE_FRAMES });
  if (showVolunteering) sections.push({ name: 'volunteering', frames: VOLUNTEERING_FRAMES, transitionIn: SLIDE_FRAMES });
  if (showTestimonial) sections.push({ name: 'testimonial', frames: TESTIMONIAL_FRAMES, transitionIn: FADE_FRAMES });
  sections.push({ name: 'guestbook', frames: GUESTBOOK_FRAMES, transitionIn: WIPE_FRAMES });
  sections.push({ name: 'end-card', frames: END_CARD_FRAMES, transitionIn: FADE_FRAMES });

  // Same cumulative math as HighlightsReel.jsx's calculateTotalFrames: a
  // transitioned section's OWN sequence starts `transitionIn` frames before
  // the running total, since the transition overlaps the tail of the prior
  // sequence with the head of this one.
  const samplePoints = [];
  let cumulative = 0;
  for (const s of sections) {
    const transitionIn = s.transitionIn || 0;
    const sectionStart = cumulative - transitionIn;
    const n = s.sampleMultiple || 1;
    for (let i = 0; i < n; i++) {
      const fraction = (i + 0.5) / n;
      const frame = sectionStart + s.frames * fraction;
      samplePoints.push({ label: n > 1 ? `${s.name}-${i + 1}` : s.name, timestamp: Math.max(0, frame / fps) });
    }
    cumulative += s.frames - transitionIn;
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
