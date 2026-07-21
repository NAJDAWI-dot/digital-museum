import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

// In-memory job registry — this is a single-user localhost tool, so no
// persistence/database is needed; a page refresh reconnects via jobs.get().
export const jobs = new Map();

class Job extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.status = 'running'; // running | done | error
    this.log = [];
    this.setMaxListeners(50);
  }

  push(line) {
    this.log.push(line);
    this.emit('line', line);
  }

  finish(status) {
    this.status = status;
    this.emit('finish', status);
  }
}

/** Runs a sequence of commands (each `{cmd, args, cwd, env}`) one after
 * another, stopping at the first failure. Streams stdout/stderr line-by-
 * line into the returned Job so a client can tail it live via SSE. Reuses
 * the exact same commands/argv the CI workflow already runs — this is an
 * orchestration wrapper, not a reimplementation of any render/publish logic. */
export function runSequence(steps) {
  const id = randomUUID();
  const job = new Job(id);
  jobs.set(id, job);

  (async () => {
    for (const step of steps) {
      job.push(`\n$ ${step.cmd} ${(step.args || []).join(' ')}\n`);
      try {
        await runOne(step, job);
      } catch (err) {
        job.push(`\n[error] ${err.message}\n`);
        job.finish('error');
        return;
      }
    }
    job.finish('done');
  })();

  return job;
}

function runOne(step, job) {
  return new Promise((resolve, reject) => {
    const child = spawn(step.cmd, step.args || [], {
      cwd: step.cwd,
      env: { ...process.env, ...(step.env || {}) },
      shell: process.platform === 'win32',
    });

    child.stdout.on('data', (chunk) => job.push(chunk.toString()));
    child.stderr.on('data', (chunk) => job.push(chunk.toString()));

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${step.cmd} exited with code ${code}`));
    });
  });
}
