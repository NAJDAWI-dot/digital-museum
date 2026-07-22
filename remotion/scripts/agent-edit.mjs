// agent-edit.mjs — the "professional video editing agent" creative-decision
// pass. Runs before select-score.mjs (which is why it comes first in the
// sequence: it can pin a track and select-score.mjs picks that up through
// its *existing* pinned-track path in reel-config.json, no changes needed
// there). Asks Claude (via a headless, non-interactive Claude Code CLI
// invocation — uses whatever Claude Code login is already active on this
// machine, no separate metered API key) to review the site's real project/
// stats/timeline content and make the same choices a human director already
// makes through the Control Station form: which projects star in the reel
// and in what order, which optional sections to include, how many photos
// per project, and which music track fits the content's mood.
//
// This is an ENHANCEMENT, not a core step — unlike fetch-live-stats.mjs
// (which exit(1)s on failure because the stats slide needs real numbers),
// any failure here (CLI not installed/logged in, malformed output) must
// leave reel-config.json untouched and let the render proceed with today's
// default behavior (random track, featured-first ordering, all sections
// on). A flaky/unavailable CLI must never cost a GPU render.
//
// Usage: node scripts/agent-edit.mjs
// Requires: the `claude` CLI on PATH and already logged in (`claude auth
// login` or an existing Claude Code session) — no ANTHROPIC_API_KEY needed.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as museumData from '../../src/data/projects.js';
import {
  readReelConfig, writeReelConfig,
  writeRenderSettings, readRenderSettings,
  listTracks, listProjects,
} from '../control-station/lib/config.mjs';

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const REMOTION_DIR = join(__dirname, '..');
const SITE_DIR = join(REMOTION_DIR, '..');
const PUBLIC_DIR = join(SITE_DIR, 'public');
const OUT_DIR = join(REMOTION_DIR, 'out');
const SCRATCH_DIR = join(OUT_DIR, 'agent-images');
const OUT_PATH = join(OUT_DIR, 'agent-edit.json');
const LIVE_STATS_PATH = join(REMOTION_DIR, 'src', 'live-stats.json');

const MAX_COVER_IMAGES = 12;
const CLI_TIMEOUT_MS = 180_000;

const INITIAL_PROJECTS = museumData.INITIAL_PROJECTS || [];
const INITIAL_TIMELINE = museumData.INITIAL_TIMELINE || [];
const INITIAL_TESTIMONIALS = museumData.INITIAL_TESTIMONIALS || [];
const INITIAL_VOLUNTEERING = museumData.INITIAL_VOLUNTEERING || [];

function writeReport(report) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 2));
}

function skip(reason) {
  console.warn(`agent-edit: skipping (${reason}) — using today's defaults.`);
  writeReport({ status: 'skipped', reason });
}

// Claude Code's Read tool needs a real file path — data-URI covers (a
// screenshot just added, not yet extracted to a real file) get decoded and
// written to a scratch file so Read can see them like any other cover image.
function resolveCoverImagePath(project) {
  const src = project.coverImage;
  if (!src) return null;
  if (src.startsWith('data:')) {
    const match = src.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) return null;
    const ext = match[1].split('/')[1] || 'jpg';
    const scratchPath = join(SCRATCH_DIR, `${project.id}.${ext}`);
    try {
      mkdirSync(SCRATCH_DIR, { recursive: true });
      writeFileSync(scratchPath, Buffer.from(match[2], 'base64'));
      return scratchPath;
    } catch {
      return null;
    }
  }
  if (/^https?:\/\//.test(src)) return null; // out of scope for v1 — no extra network fetch
  const filePath = join(PUBLIC_DIR, src);
  return existsSync(filePath) ? filePath : null;
}

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
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
  if (INITIAL_PROJECTS.length === 0) return skip('no projects to choose from');

  const tracks = listTracks();
  if (tracks.length === 0) return skip('no music tracks found');

  let liveStats = {};
  try { liveStats = JSON.parse(readFileSync(LIVE_STATS_PATH, 'utf8')); } catch { /* fetch-live-stats hasn't run or failed; fine, agent just sees zeros */ }

  const renderSettings = readRenderSettings();

  const projectBriefs = [];
  const imageRefs = [];
  let imagesUsed = 0;
  for (const p of INITIAL_PROJECTS) {
    projectBriefs.push({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle || '',
      category: p.category || '',
      year: p.year || '',
      status: p.status || '',
      featured: Boolean(p.featured),
      tech: Array.isArray(p.tech) ? p.tech : [],
      collaboratorCount: Array.isArray(p.collaborators) ? p.collaborators.length : 0,
      description: truncate(p.description, 300),
      hasModel: Boolean(p.model),
      hasAudio: Boolean(p.audio),
      screenshotCount: Array.isArray(p.screenshots) ? p.screenshots.length : 0,
    });

    if (imagesUsed < MAX_COVER_IMAGES) {
      const imgPath = resolveCoverImagePath(p);
      if (imgPath) {
        imageRefs.push(`- ${imgPath}  (project: "${p.title}", id: ${p.id})`);
        imagesUsed++;
      }
    }
  }

  const briefText = `You are a professional video editor cutting a ~90 second highlights reel for a single creator's portfolio site. The reel has a fixed section structure you are choosing content for:

Title -> Projects Montage -> Stats -> [Timeline] -> [Volunteering] -> [Testimonial] -> Guestbook -> End Card

(Sections in [brackets] are optional and can be switched off if there's nothing worth showing.)

First, use the Read tool to look at these cover images so you can judge visual quality and variety when ordering the montage:
${imageRefs.join('\n') || '(no cover images available to read)'}

Your job is to make the same editorial calls a human director would make through this project's "Control Station" tool:
1. Which projects star in the montage, and in what order (this controls montage order and screen time — first project shown gets the strongest opening beat, last gets the closing beat before Stats).
2. Whether to include the Timeline, Volunteering, and Testimonial sections — only include a section if the underlying content is actually substantive; do not include an empty or thin section just because it's available.
3. How many photos per project to show in the montage (1-4) — more photos means more screen time per project but a longer reel; fewer is snappier.
4. Which music track best fits the overall mood of this creator's work, chosen only from the real filenames listed below.

You can only choose from the real material given below — never invent projects, testimonials, or content that isn't listed.

PROJECTS (${projectBriefs.length} total):
${JSON.stringify(projectBriefs, null, 2)}

STATS: ${liveStats.guestbookCount || 0} guestbook signatures, ${liveStats.totalLikes || 0} total appreciation likes.

TIMELINE ENTRIES: ${INITIAL_TIMELINE.length} (${INITIAL_TIMELINE.map(t => t.title).filter(Boolean).join(', ') || 'none'})
VOLUNTEERING ENTRIES: ${INITIAL_VOLUNTEERING.length} (${INITIAL_VOLUNTEERING.map(v => v.title).filter(Boolean).join(', ') || 'none'})
TESTIMONIALS: ${INITIAL_TESTIMONIALS.filter(t => t.quote).length} with a real quote

AVAILABLE MUSIC TRACKS (choose exactly one filename, or "random" if none fit):
${tracks.join('\n')}

Constraints: at most ${renderSettings.maxShowcaseProjects || 'no'} showcase projects (if a cap is set), photosPerProject must be an integer 1-4.

Respond with ONLY a single JSON object — no markdown code fences, no other text before or after — matching exactly this shape:
{
  "starProjects": ["<ordered real project ids>"],
  "sections": { "timeline": true, "volunteering": true, "testimonial": true },
  "photosPerProject": 2,
  "track": "<exact filename from the list above, or \\"random\\">",
  "rationale": { "overall": "...", "projectOrder": "...", "sections": "...", "music": "..." }
}`;

  let resultText;
  try {
    resultText = await runClaudeHeadless(briefText, [PUBLIC_DIR, SCRATCH_DIR]);
  } catch (e) {
    return skip(`claude CLI invocation failed: ${e.message}`);
  }

  const decision = extractJson(resultText);
  if (!decision) return skip('could not parse a JSON decision from the model output');

  const realIds = new Set((listProjects().length ? listProjects() : INITIAL_PROJECTS.map(p => ({ id: p.id }))).map(p => p.id));
  const validStarProjects = Array.isArray(decision.starProjects)
    ? decision.starProjects.filter(id => realIds.has(id))
    : [];
  const validTrack = (decision.track === 'random' || tracks.includes(decision.track)) ? decision.track : 'random';
  const validPhotosPerProject = Number.isInteger(decision.photosPerProject)
    ? Math.max(1, Math.min(4, decision.photosPerProject))
    : readRenderSettings().photosPerProject;

  const newReelConfig = writeReelConfig({
    track: validTrack,
    starProjects: validStarProjects.length ? validStarProjects : null,
    sections: {
      timeline: decision.sections?.timeline !== false,
      volunteering: decision.sections?.volunteering !== false,
      testimonial: decision.sections?.testimonial !== false,
    },
  });
  const newRenderSettings = writeRenderSettings({ photosPerProject: validPhotosPerProject });

  writeReport({
    status: 'applied',
    engine: 'claude-code-cli',
    decision: {
      starProjects: newReelConfig.starProjects,
      sections: newReelConfig.sections,
      track: newReelConfig.track,
      photosPerProject: newRenderSettings.photosPerProject,
    },
    rationale: decision.rationale || null,
    projectsConsidered: projectBriefs.length,
    imagesConsidered: imagesUsed,
  });

  console.log('agent-edit: applied editorial decision', {
    starProjects: newReelConfig.starProjects,
    sections: newReelConfig.sections,
    track: newReelConfig.track,
    photosPerProject: newRenderSettings.photosPerProject,
  });
}

main().catch(e => {
  // Belt-and-suspenders: even an unexpected bug here must not fail the render.
  console.warn('agent-edit: unexpected error, using defaults:', e);
  try { writeReport({ status: 'skipped', reason: `unexpected error: ${e.message}` }); } catch { /* out dir issue — nothing more we can do */ }
});
