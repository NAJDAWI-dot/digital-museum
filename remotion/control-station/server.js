import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  readReelConfig, writeReelConfig,
  readRenderSettings, writeRenderSettings,
  listTracks, listProjects,
} from './lib/config.mjs';
import { runSequence, jobs } from './lib/runScript.mjs';
import { publish, previewDiscard } from './lib/gitPublish.mjs';

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
    { cmd: 'node', args: ['scripts/fetch-live-stats.mjs'], cwd: REMOTION_DIR },
    { cmd: 'node', args: ['scripts/select-score.mjs'], cwd: REMOTION_DIR },
    { cmd: 'npx', args: ['remotion', 'render', 'src/index.jsx', 'HighlightsReel', 'out/highlights.mp4', ...renderFlags], cwd: REMOTION_DIR },
    { cmd: 'npx', args: ['remotion', 'render', 'src/index.jsx', 'HighlightsReelVertical', 'out/highlights-vertical.mp4', ...renderFlags], cwd: REMOTION_DIR },
    { cmd: 'npx', args: ['remotion', 'still', 'src/index.jsx', 'HighlightsReel', 'out/highlights-poster.jpg', '--frame=80'], cwd: REMOTION_DIR },
    { cmd: 'node', args: ['scripts/web-encode.mjs', 'out/highlights.mp4', 'out/highlights-web.mp4'], cwd: REMOTION_DIR },
    { cmd: 'node', args: ['scripts/web-encode.mjs', 'out/highlights-vertical.mp4', 'out/highlights-vertical-web.mp4'], cwd: REMOTION_DIR },
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

// --- output files ----------------------------------------------------------
app.get('/api/outputs', (req, res) => {
  const files = ['highlights-web.mp4', 'highlights-vertical-web.mp4', 'highlights-poster.jpg'];
  res.json(files.filter((f) => existsSync(join(OUT_DIR, f))).map((f) => ({ name: f, url: `/out/${f}` })));
});

const PORT = process.env.PORT || 4500;
// Localhost only, deliberately — this tool has no auth and can trigger a
// git push to main, so it must never be reachable from the network.
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Reel control station: http://localhost:${PORT}`);
});
