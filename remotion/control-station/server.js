import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { networkInterfaces } from 'node:os';

import {
  readReelConfig, writeReelConfig,
  readRenderSettings, writeRenderSettings,
  listTracks, listProjects,
} from './lib/config.mjs';
import { runSequence, jobs } from './lib/runScript.mjs';
import { publish, publishTrailer, previewDiscard } from './lib/gitPublish.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REMOTION_DIR = join(__dirname, '..');
const SITE_DIR = join(REMOTION_DIR, '..');
const OUT_DIR = join(REMOTION_DIR, 'out');

// Loads VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY from the site's own .env —
// fetch-live-stats.mjs needs these and normally gets them from CI secrets;
// locally they come from the developer's existing .env instead.
dotenv.config({ path: join(SITE_DIR, '.env') });

// Git LFS must be installed in this working tree for public/highlights*.mp4
// commits to actually go through the LFS filter (.gitattributes) rather
// than as plain large blobs — done once here so a developer never has to
// remember it before using the Publish button.
spawnSync('git', ['lfs', 'install'], { cwd: SITE_DIR, shell: process.platform === 'win32' });

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));
app.use('/out', express.static(OUT_DIR));

// --- reel-config.json -------------------------------------------------
app.get('/api/reel-config', (req, res) => {
  res.json({ config: readReelConfig(), projects: listProjects() });
});
app.put('/api/reel-config', (req, res) => {
  res.json(writeReelConfig(req.body || {}));
});

// --- render-settings.json ----------------------------------------------
app.get('/api/render-settings', (req, res) => {
  res.json(readRenderSettings());
});
app.put('/api/render-settings', (req, res) => {
  res.json(writeRenderSettings(req.body || {}));
});

// --- music tracks --------------------------------------------------------
app.get('/api/tracks', (req, res) => {
  res.json(listTracks());
});

// --- render ---------------------------------------------------------------
app.post('/api/render', (req, res) => {
  const settings = readRenderSettings();

  // Hardware acceleration + master quality (crf vs. bitrate) are both set
  // from render-settings.json inside remotion.config.js itself (crf isn't
  // valid alongside hardware acceleration — @remotion/renderer hard-rejects
  // it, confirmed by hitting that exact error — so the config switches to
  // an explicit bitrate whenever hardware acceleration isn't "disable").
  // No need to also pass --hardware-acceleration here; the config file is
  // the single source of truth for both, evaluated from this same JSON.
  // --concurrency is the one setting that actually speeds up the dominant
  // "Rendered X/Y" phase (headless-Chromium frame capture, not encoding),
  // and has no Config.set equivalent already wired here, so it stays a
  // per-invocation CLI flag.
  const renderFlags = [];
  if (settings.concurrency) renderFlags.push(`--concurrency=${settings.concurrency}`);

  const steps = [
    // Materializes any freshly-added base64 screenshots to real files first —
    // CI always runs this before rendering; the control station previously
    // assumed it had already happened, which the "editing agent" step below
    // can't rely on since it reads cover images straight off disk.
    { cmd: 'node', args: ['scripts/extract-images.mjs'], cwd: SITE_DIR },
    { cmd: 'node', args: ['scripts/fetch-live-stats.mjs'], cwd: REMOTION_DIR },
    // The editing agent runs BEFORE select-score so it can pin a track by
    // writing reel-config.json — select-score.mjs picks that up through its
    // existing pinned-track path with no changes needed there. See
    // scripts/agent-edit.mjs for what it decides and how it fails safe.
    { cmd: 'node', args: ['scripts/agent-edit.mjs'], cwd: REMOTION_DIR },
    { cmd: 'node', args: ['scripts/select-score.mjs'], cwd: REMOTION_DIR },
    { cmd: 'npx', args: ['remotion', 'render', 'src/index.jsx', 'HighlightsReel', 'out/highlights.mp4', ...renderFlags], cwd: REMOTION_DIR },
    { cmd: 'npx', args: ['remotion', 'render', 'src/index.jsx', 'HighlightsReelVertical', 'out/highlights-vertical.mp4', ...renderFlags], cwd: REMOTION_DIR },
    { cmd: 'npx', args: ['remotion', 'still', 'src/index.jsx', 'HighlightsReel', 'out/highlights-poster.jpg', '--frame=80'], cwd: REMOTION_DIR },
    { cmd: 'node', args: ['scripts/web-encode.mjs', 'out/highlights.mp4', 'out/highlights-web.mp4'], cwd: REMOTION_DIR },
    { cmd: 'node', args: ['scripts/web-encode.mjs', 'out/highlights-vertical.mp4', 'out/highlights-vertical-web.mp4'], cwd: REMOTION_DIR },
    // QA pass on the rendered master — advisory only, shown in the UI
    // alongside the preview, never gates Publish. See scripts/agent-review.mjs.
    { cmd: 'node', args: ['scripts/agent-review.mjs'], cwd: REMOTION_DIR },
  ];
  const job = runSequence(steps);
  res.json({ jobId: job.id });
});

// Project ids are always plain alphanumeric (generated as `p${Date.now()}`
// — see src/data/projects.js) and this value flows into a spawned command
// line (shell:true on Windows, per runScript.mjs) as part of a --props JSON
// string, so it's validated here before it ever reaches spawn — the same
// guard gitPublish.mjs's publishTrailer applies before it becomes a
// filesystem path.
const SAFE_PROJECT_ID = /^[A-Za-z0-9_-]+$/;

// --- render trailer ---------------------------------------------------------
app.post('/api/render-trailer', (req, res) => {
  const projectId = req.body?.projectId;
  if (!projectId || !SAFE_PROJECT_ID.test(projectId)) {
    return res.status(400).json({ error: 'invalid projectId' });
  }
  const propsJson = JSON.stringify({ projectId });
  const steps = [
    { cmd: 'node', args: ['scripts/extract-images.mjs'], cwd: SITE_DIR },
    { cmd: 'node', args: ['scripts/select-score.mjs'], cwd: REMOTION_DIR },
    { cmd: 'npx', args: ['remotion', 'render', 'src/index.jsx', 'ProjectTrailer', 'out/trailer.mp4', `--props=${propsJson}`], cwd: REMOTION_DIR },
    { cmd: 'node', args: ['scripts/web-encode.mjs', 'out/trailer.mp4', 'out/trailer-web.mp4'], cwd: REMOTION_DIR },
  ];
  const job = runSequence(steps);
  res.json({ jobId: job.id });
});

app.get('/api/render/status', (req, res) => {
  const job = jobs.get(req.query.jobId);
  if (!job) return res.status(404).json({ error: 'not found' });
  res.json({ status: job.status, log: job.log.join('') });
});

function streamJob(job, req, res) {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  // Replay what's already happened, then live-tail.
  res.write(`data: ${JSON.stringify({ type: 'log', text: job.log.join('') })}\n\n`);
  if (job.status !== 'running') {
    res.write(`data: ${JSON.stringify({ type: 'finish', status: job.status })}\n\n`);
    return res.end();
  }
  const onLine = (line) => res.write(`data: ${JSON.stringify({ type: 'log', text: line })}\n\n`);
  const onFinish = (status) => {
    res.write(`data: ${JSON.stringify({ type: 'finish', status })}\n\n`);
    res.end();
  };
  job.on('line', onLine);
  job.on('finish', onFinish);
  req.on('close', () => {
    job.off('line', onLine);
    job.off('finish', onFinish);
  });
}

app.get('/api/render/stream', (req, res) => {
  const job = jobs.get(req.query.jobId);
  if (!job) return res.status(404).end();
  streamJob(job, req, res);
});

// --- publish (highest-risk action) ---------------------------------------
app.get('/api/publish/preview', async (req, res) => {
  res.json({ statusPorcelain: await previewDiscard() });
});

app.post('/api/publish', (req, res) => {
  if (req.body?.confirm !== true) {
    return res.status(400).json({ error: 'confirm:true is required' });
  }
  const job = publish({ confirm: true });
  res.json({ jobId: job.id });
});

app.get('/api/publish/stream', (req, res) => {
  const job = jobs.get(req.query.jobId);
  if (!job) return res.status(404).end();
  streamJob(job, req, res);
});

app.post('/api/publish-trailer', (req, res) => {
  const { confirm, projectId } = req.body || {};
  if (confirm !== true) {
    return res.status(400).json({ error: 'confirm:true is required' });
  }
  if (!projectId || !SAFE_PROJECT_ID.test(projectId)) {
    return res.status(400).json({ error: 'invalid projectId' });
  }
  const job = publishTrailer({ confirm: true, projectId });
  res.json({ jobId: job.id });
});

app.get('/api/publish-trailer/stream', (req, res) => {
  const job = jobs.get(req.query.jobId);
  if (!job) return res.status(404).end();
  streamJob(job, req, res);
});

// --- output files ----------------------------------------------------------
app.get('/api/outputs', (req, res) => {
  const files = ['highlights-web.mp4', 'highlights-vertical-web.mp4', 'highlights-poster.jpg'];
  res.json(files.filter((f) => existsSync(join(OUT_DIR, f))).map((f) => ({ name: f, url: `/out/${f}` })));
});

app.get('/api/trailer-outputs', (req, res) => {
  const files = ['trailer-web.mp4'];
  res.json(files.filter((f) => existsSync(join(OUT_DIR, f))).map((f) => ({ name: f, url: `/out/${f}` })));
});

// --- editing agent reports ---------------------------------------------
function readJsonReport(name) {
  const path = join(OUT_DIR, name);
  if (!existsSync(path)) return { status: 'none' };
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { status: 'none' };
  }
}
app.get('/api/agent-edit', (req, res) => {
  res.json(readJsonReport('agent-edit.json'));
});
app.get('/api/agent-review', (req, res) => {
  res.json(readJsonReport('agent-review.json'));
});

const PORT = process.env.PORT || 4500;
// Bound to all interfaces (reachable from the local network), by explicit
// choice — this tool still has NO authentication and can trigger a git push
// to main, so anyone on this network/Wi-Fi can render and publish. Only do
// this on a network you trust every device on.
app.listen(PORT, '0.0.0.0', () => {
  const lanIp = Object.values(networkInterfaces())
    .flat()
    .find((i) => i.family === 'IPv4' && !i.internal)?.address;
  console.log(`Reel control station: http://localhost:${PORT}`);
  if (lanIp) console.log(`  also reachable on your network at: http://${lanIp}:${PORT}`);
});
