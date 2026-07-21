import { spawn } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { jobs } from './runScript.mjs';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REMOTION_DIR = join(__dirname, '..', '..');
const SITE_DIR = join(REMOTION_DIR, '..');
const OUT_DIR = join(REMOTION_DIR, 'out');
const PUBLIC_DIR = join(SITE_DIR, 'public');

class Job extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.status = 'running';
    this.log = [];
    this.setMaxListeners(50);
  }
  push(line) { this.log.push(line); this.emit('line', line); }
  finish(status) { this.status = status; this.emit('finish', status); }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: SITE_DIR, shell: process.platform === 'win32', ...opts });
    let stdout = '';
    child.stdout?.on('data', (c) => { stdout += c.toString(); opts.job?.push(c.toString()); });
    child.stderr?.on('data', (c) => { opts.job?.push(c.toString()); });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout: stdout.trim() }));
  });
}

/** Local port of render-highlights.yml's "Publish rendered video" step —
 * same sequence, same git commands, run from the developer's own working
 * tree instead of a CI runner. Requires an explicit `{confirm: true}` from
 * the caller (the route layer also enforces this) since `git reset --hard`
 * discards ALL uncommitted local changes repo-wide, not just remotion/. */
export function publish({ confirm }) {
  const id = randomUUID();
  const job = new Job(id);
  jobs.set(id, job);

  if (!confirm) {
    job.push('Refused: publish requires explicit confirmation.\n');
    job.finish('error');
    return job;
  }

  (async () => {
    try {
      job.push('Ensuring Git LFS is installed in this working tree...\n');
      await run('git', ['lfs', 'install'], { job });

      job.push('\nFetching origin/main...\n');
      const fetch = await run('git', ['fetch', 'origin', 'main'], { job });
      if (fetch.code !== 0) throw new Error('git fetch failed');

      job.push('\nResetting to origin/main (discards local changes)...\n');
      const reset = await run('git', ['reset', '--hard', 'origin/main'], { job });
      if (reset.code !== 0) throw new Error('git reset --hard failed');

      job.push('\nCopying rendered files into public/...\n');
      copyFileSync(join(OUT_DIR, 'highlights-web.mp4'), join(PUBLIC_DIR, 'highlights.mp4'));
      copyFileSync(join(OUT_DIR, 'highlights-vertical-web.mp4'), join(PUBLIC_DIR, 'highlights-vertical.mp4'));
      copyFileSync(join(OUT_DIR, 'highlights-poster.jpg'), join(PUBLIC_DIR, 'highlights-poster.jpg'));

      await run('git', ['add', 'public/highlights.mp4', 'public/highlights-vertical.mp4', 'public/highlights-poster.jpg'], { job });

      // `git diff --quiet` misses brand-new untracked files; diffing the
      // staged version against HEAD (--cached) catches those too — same
      // reasoning as the CI workflow's own comment on this exact check.
      const diff = await run('git', ['diff', '--cached', '--quiet'], { job: null });
      if (diff.code === 0) {
        job.push('\nNo changes to publish (output is identical to what\'s already live).\n');
        job.finish('done');
        return;
      }

      job.push('\nCommitting...\n');
      await run('git', ['commit', '-m', 'chore: regenerate highlights reel (local)'], { job });

      job.push('\nPushing to origin/main...\n');
      const push = await run('git', ['push', 'origin', 'HEAD:main'], { job });
      if (push.code !== 0) throw new Error('git push failed');

      const rev = await run('git', ['rev-parse', 'HEAD'], { job: null });
      const newSha = rev.stdout;

      job.push('\nWaiting for GitHub to catch up before dispatching deploy...\n');
      let caughtUp = false;
      for (let i = 0; i < 15; i++) {
        const remote = await run('gh', ['api', 'repos/{owner}/{repo}/git/ref/heads/main', '--jq', '.object.sha'], { job: null });
        if (remote.stdout === newSha) { caughtUp = true; break; }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!caughtUp) job.push('Warning: main ref did not catch up in time; dispatching deploy anyway.\n');

      job.push('\nDispatching deploy.yml...\n');
      await run('gh', ['workflow', 'run', 'deploy.yml', '--ref', 'main'], { job });

      job.push('\nPublish complete.\n');
      job.finish('done');
    } catch (err) {
      job.push(`\n[error] ${err.message}\n`);
      job.finish('error');
    }
  })();

  return job;
}

/** Read-only preview of what a publish's `git reset --hard` would discard —
 * shown to the user before they can confirm. */
export async function previewDiscard() {
  const status = await run('git', ['status', '--porcelain'], {});
  return status.stdout;
}
