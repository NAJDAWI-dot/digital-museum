import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REMOTION_DIR = join(__dirname, '..', '..');
const SITE_DIR = join(REMOTION_DIR, '..');

export const REEL_CONFIG_PATH = join(REMOTION_DIR, 'reel-config.json');
export const RENDER_SETTINGS_PATH = join(REMOTION_DIR, 'render-settings.json');
const MUSIC_DIR = join(REMOTION_DIR, 'music', 'cinematic');
const PROJECTS_DATA_PATH = join(SITE_DIR, 'src', 'data', 'projects.js');

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

export function readReelConfig() {
  return readJson(REEL_CONFIG_PATH, { track: 'random', starProjects: null, sections: { timeline: true, volunteering: true, testimonial: true } });
}

export function writeReelConfig(next) {
  const current = readReelConfig();
  const merged = {
    track: typeof next.track === 'string' ? next.track : current.track,
    starProjects: Array.isArray(next.starProjects) ? next.starProjects : current.starProjects,
    sections: {
      timeline: next.sections?.timeline ?? current.sections?.timeline ?? true,
      volunteering: next.sections?.volunteering ?? current.sections?.volunteering ?? true,
      testimonial: next.sections?.testimonial ?? current.sections?.testimonial ?? true,
    },
  };
  writeFileSync(REEL_CONFIG_PATH, JSON.stringify(merged, null, 2) + '\n');
  return merged;
}

export function readRenderSettings() {
  return readJson(RENDER_SETTINGS_PATH, {
    fps: 60, width: 1920, height: 1080,
    masterCrf: 14, webCrf: 22, webPreset: 'slow',
    audioBitrateKbps: 128, imageFormat: 'png', photosPerProject: 3,
    hardwareAcceleration: 'disable', webEncoder: 'libx264', concurrency: null,
    masterBitrate: '40M', maxShowcaseProjects: null,
  });
}

const clamp = (v, min, max, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

// e.g. "40M", "8000k" — the same shorthand ffmpeg/Remotion's own bitrate
// options accept.
const isBitrateString = (v) => typeof v === 'string' && /^\d+[kKmM]$/.test(v);

// Defense-in-depth: clamp server-side too, not just via the form's min/max
// attributes, since a render at an absurd fps/resolution/CRF could tie up
// the machine or produce an unplayable file.
export function writeRenderSettings(next) {
  const current = readRenderSettings();
  const merged = {
    fps: clamp(next.fps, 15, 60, current.fps),
    width: clamp(next.width, 480, 3840, current.width),
    height: clamp(next.height, 480, 3840, current.height),
    masterCrf: clamp(next.masterCrf, 0, 30, current.masterCrf),
    webCrf: clamp(next.webCrf, 0, 35, current.webCrf),
    webPreset: ['ultrafast', 'fast', 'medium', 'slow', 'veryslow'].includes(next.webPreset) ? next.webPreset : current.webPreset,
    audioBitrateKbps: clamp(next.audioBitrateKbps, 64, 320, current.audioBitrateKbps),
    imageFormat: ['png', 'jpeg'].includes(next.imageFormat) ? next.imageFormat : current.imageFormat,
    photosPerProject: clamp(next.photosPerProject, 1, 4, current.photosPerProject),
    hardwareAcceleration: ['disable', 'if-possible', 'required'].includes(next.hardwareAcceleration)
      ? next.hardwareAcceleration : current.hardwareAcceleration,
    webEncoder: ['libx264', 'h264_nvenc'].includes(next.webEncoder) ? next.webEncoder : current.webEncoder,
    masterBitrate: isBitrateString(next.masterBitrate) ? next.masterBitrate : current.masterBitrate,
    // null/0/blank = let Remotion pick its own default concurrency; a
    // positive integer pins it explicitly.
    concurrency: next.concurrency === null || next.concurrency === '' || next.concurrency === undefined
      ? null
      : clamp(next.concurrency, 1, 32, current.concurrency),
    // null/0/blank = show every real project — a positive integer caps it.
    maxShowcaseProjects: next.maxShowcaseProjects === null || next.maxShowcaseProjects === '' || next.maxShowcaseProjects === undefined
      ? null
      : clamp(next.maxShowcaseProjects, 1, 20, current.maxShowcaseProjects),
  };
  writeFileSync(RENDER_SETTINGS_PATH, JSON.stringify(merged, null, 2) + '\n');
  return merged;
}

export function listTracks() {
  try {
    return readdirSync(MUSIC_DIR).filter(f => f.toLowerCase().endsWith('.mp3'));
  } catch {
    return [];
  }
}

// A light, regex-based read of projects.js — avoids importing the site's
// full ESM data module (which pulls in unrelated build-time concerns) just
// to get id/title/category for the star-project picker.
export function listProjects() {
  let src;
  try {
    src = readFileSync(PROJECTS_DATA_PATH, 'utf8');
  } catch {
    return [];
  }
  const projects = [];
  // projects.js objects have nested arrays/objects (collaborators, tech) —
  // a single flat regex won't reliably match every field pair across those,
  // so instead split on top-level project boundaries via the "id" field
  // (always present, always last-ish) and pull title/category/id from each
  // chunk independently rather than requiring one match to span the whole
  // object.
  const chunks = src.split(/(?=\{\s*\n\s*"title":)/g);
  for (const chunk of chunks) {
    const title = chunk.match(/"title":\s*"((?:[^"\\]|\\.)*)"/)?.[1];
    const category = chunk.match(/"category":\s*"((?:[^"\\]|\\.)*)"/)?.[1];
    const id = chunk.match(/"id":\s*"((?:[^"\\]|\\.)*)"/)?.[1];
    if (title && id) projects.push({ id, title, category: category || '' });
  }
  return projects;
}
