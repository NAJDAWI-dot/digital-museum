// Analyses every track in music/cinematic/ and writes the result to
// music/analysis/<track>.json, which is committed.
//
// This runs offline, by hand, when tracks are added or replaced — never
// during a render. That is the whole design: beat detection is the one part
// of this pipeline that can be confidently wrong, so its output is a file a
// human can read and correct rather than something recomputed unattended
// every Tuesday. Each analysis carries a `manualOverride` block for exactly
// that: set bpm/firstBeat there and it wins permanently.
//
// Usage:
//   node scripts/analyze-music.mjs             analyse tracks with no/stale analysis
//   node scripts/analyze-music.mjs --force     re-analyse everything
//   node scripts/analyze-music.mjs --report    print a summary table, write nothing
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import {
  onsetEnvelope,
  estimateTempo,
  trackBeats,
  estimateDownbeatPhase,
  findEvents,
  qualityLevel,
  refineTempoFromBeats,
} from './lib/audio-analysis.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MUSIC_DIR = join(__dirname, '..', 'music', 'cinematic');
const ANALYSIS_DIR = join(__dirname, '..', 'music', 'analysis');

const ANALYSIS_VERSION = 1;
const SAMPLE_RATE = 22050; // plenty for onsets, and a quarter of the work of 44.1k
const ENERGY_HOP_SECONDS = 0.1;

const force = process.argv.includes('--force');
const reportOnly = process.argv.includes('--report');

/** Decode to mono float32 at SAMPLE_RATE. */
function decode(filePath) {
  const raw = execFileSync(
    ffmpegPath,
    ['-v', 'error', '-i', filePath, '-f', 'f32le', '-ac', '1', '-ar', String(SAMPLE_RATE), '-'],
    { maxBuffer: 1024 * 1024 * 512 },
  );
  return new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
}

/** Short-window RMS, converted to a 0..1 curve. Cheap, and unlike the beat
 * grid it works on anything. */
function energyCurve(samples) {
  const win = Math.floor(ENERGY_HOP_SECONDS * SAMPLE_RATE);
  const out = [];
  for (let i = 0; i + win <= samples.length; i += win) {
    let acc = 0;
    for (let k = i; k < i + win; k++) acc += samples[k] * samples[k];
    out.push(Math.sqrt(acc / win));
  }
  const max = Math.max(...out, 1e-9);
  return out.map(v => +(v / max).toFixed(4));
}

function fileHash(filePath) {
  return 'sha1:' + createHash('sha1').update(readFileSync(filePath)).digest('hex').slice(0, 16);
}

function analyse(track) {
  const filePath = join(MUSIC_DIR, track);
  const samples = decode(filePath);
  const duration = samples.length / SAMPLE_RATE;

  const { envelope, hopSeconds } = onsetEnvelope(samples, SAMPLE_RATE);
  const tempo = estimateTempo(envelope, hopSeconds);

  let beats = [];
  let strength = 0;
  if (tempo.bpm) {
    const tracked = trackBeats(envelope, hopSeconds, tempo.beatSeconds);
    beats = tracked.beats ?? [];
    strength = tracked.strength ?? 0;
  }

  // The autocorrelation tempo is only accurate to the hop size; the tracked
  // beats are not. Prefer the refined fit whenever there are enough beats.
  const refined = refineTempoFromBeats(beats);
  const meter = 4;
  const downbeatPhase = beats.length ? estimateDownbeatPhase(beats, samples, SAMPLE_RATE, meter) : 0;
  const energy = energyCurve(samples);
  const events = findEvents(energy, ENERGY_HOP_SECONDS);

  // Two independent signals: how peaked the autocorrelation was, and how well
  // the DP solution actually scored. Agreement is what earns "high".
  const confidence = tempo.bpm
    ? +Math.min(1, tempo.confidence * 0.6 + Math.min(1, strength / 2) * 0.4).toFixed(3)
    : 0;

  const warnings = [];
  if (!tempo.bpm) warnings.push('no tempo found');
  if (beats.length && beats.length < duration / 4) warnings.push('suspiciously few beats');

  return {
    version: ANALYSIS_VERSION,
    track,
    fileHash: fileHash(filePath),
    duration: +duration.toFixed(2),
    analyzedAt: new Date().toISOString(),
    analyzer: 'flux-acf-dp@1',
    tempo: tempo.bpm
      ? {
        bpm: +(refined?.bpm ?? tempo.bpm).toFixed(3),
        beatSeconds: +(refined?.beatSeconds ?? tempo.beatSeconds).toFixed(6),
        meter,
        barSeconds: +((refined?.beatSeconds ?? tempo.beatSeconds) * meter).toFixed(6),
        phraseBars: 8,
        confidence: +tempo.confidence.toFixed(3),
        // Kept for comparison: this is the hop-quantized figure the
        // autocorrelation produced before fitting the tracked beats.
        acfBpm: +tempo.bpm.toFixed(2),
        // How well the beats fit a constant tempo. Cinematic writing is often
        // rubato, and a poor fit means the grid is only trustworthy locally.
        steady: refined ? refined.steady : false,
        rmsErrorSeconds: refined ? +refined.rmsErrorSeconds.toFixed(4) : null,
      }
      : null,
    grid: {
      downbeatPhase,
      firstBeat: refined ? +refined.firstBeat.toFixed(3) : (beats[0] ?? 0),
      beats: beats.map(b => +b.toFixed(3)),
    },
    energy: { hopSeconds: ENERGY_HOP_SECONDS, normalized: energy },
    events,
    quality: { confidence, level: qualityLevel(confidence), warnings },
    // Set { bpm, firstBeat, note } here to override the detector permanently.
    // Consumers must prefer this over the detected values.
    manualOverride: null,
  };
}

function existing(track) {
  const path = join(ANALYSIS_DIR, track.replace(/\.mp3$/i, '.json'));
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const tracks = readdirSync(MUSIC_DIR).filter(f => f.toLowerCase().endsWith('.mp3')).sort();
if (tracks.length === 0) throw new Error(`No .mp3 files in ${MUSIC_DIR}`);

mkdirSync(ANALYSIS_DIR, { recursive: true });

const rows = [];
for (const track of tracks) {
  const prior = existing(track);
  const stillValid =
    prior &&
    prior.version === ANALYSIS_VERSION &&
    prior.fileHash === fileHash(join(MUSIC_DIR, track));

  let result;
  if (stillValid && !force && !reportOnly) {
    result = prior;
    rows.push({ track, ...summarise(result), status: 'cached' });
  } else {
    result = analyse(track);
    if (!reportOnly) {
      // Preserve a human's override across re-analysis — losing it silently
      // would defeat the point of having one.
      if (prior?.manualOverride) result.manualOverride = prior.manualOverride;
      writeFileSync(
        join(ANALYSIS_DIR, track.replace(/\.mp3$/i, '.json')),
        JSON.stringify(result, null, 2) + '\n',
      );
    }
    rows.push({ track, ...summarise(result), status: reportOnly ? 'analysed' : 'written' });
  }
}

function summarise(a) {
  return {
    duration: a.duration,
    bpm: a.tempo?.bpm ?? null,
    acfBpm: a.tempo?.acfBpm ?? null,
    steady: a.tempo?.steady ? 'yes' : 'no',
    beats: a.grid.beats.length,
    phase: a.grid.downbeatPhase,
    confidence: a.quality.confidence,
    level: a.quality.level,
    events: a.events.length,
    override: a.manualOverride ? 'yes' : '',
  };
}

console.log('');
console.log('track'.padEnd(46) + 'dur'.padStart(7) + 'bpm'.padStart(9) + 'acf'.padStart(8) +
  'steady'.padStart(8) + 'beats'.padStart(7) + 'phase'.padStart(6) + 'conf'.padStart(7) +
  'level'.padStart(8) + 'evts'.padStart(6) + '  status');
console.log('-'.repeat(120));
for (const r of rows) {
  console.log(
    r.track.slice(0, 44).padEnd(46) +
    String(r.duration).padStart(7) +
    String(r.bpm ?? '—').padStart(9) +
    String(r.acfBpm ?? '—').padStart(8) +
    String(r.steady).padStart(8) +
    String(r.beats).padStart(7) +
    String(r.phase).padStart(6) +
    String(r.confidence).padStart(7) +
    String(r.level).padStart(8) +
    String(r.events).padStart(6) +
    '  ' + r.status + (r.override ? '  (manual override)' : ''),
  );
}
console.log('');
console.log('Sanity-check the bpm column by ear before trusting a cut built on it.');
console.log('A wrong value can be pinned permanently via "manualOverride" in the JSON.');
