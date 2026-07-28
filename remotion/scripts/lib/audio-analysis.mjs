// Beat and structure analysis for the cinematic tracks, in plain JS.
//
// Runs offline, never during a render. There are seven tracks and they do not
// change, so paying a beat-detection tax on every Tuesday render — and
// risking a bad detection shipping unattended — buys nothing. analyze-music
// writes the result to music/analysis/<track>.json and that file is
// committed. A wrong BPM then becomes a wrong number in a reviewable file
// rather than a wrong video nobody watched.
//
// The chain is the standard one: decode -> spectral flux onset envelope ->
// autocorrelation for tempo -> dynamic programming for the beat sequence.
// It is deliberately hand-rolled rather than pulled from a library: the whole
// thing is about 200 lines, it adds no dependency to a Windows self-hosted
// runner, and the accuracy that heavier libraries buy is spent on beat-level
// precision that gets quantized away at the bar level anyway.

/** In-place iterative radix-2 FFT on interleaved-free split arrays. */
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

const FFT_SIZE = 1024;
const HOP = 256;

/** Half-wave-rectified spectral flux: how much energy *appeared* since the
 * previous frame. Rectification is the point — note onsets are increases in
 * energy, and counting decreases as well would blur every attack. */
export function onsetEnvelope(samples, sampleRate) {
  const window = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)); // Hann
  }

  const bins = FFT_SIZE / 2;
  const frames = Math.max(0, Math.floor((samples.length - FFT_SIZE) / HOP));
  const flux = new Float32Array(frames);
  let prev = new Float32Array(bins);
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);

  for (let f = 0; f < frames; f++) {
    const offset = f * HOP;
    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = samples[offset + i] * window[i];
      im[i] = 0;
    }
    fft(re, im);

    let sum = 0;
    const mag = new Float32Array(bins);
    for (let b = 0; b < bins; b++) {
      const m = Math.sqrt(re[b] * re[b] + im[b] * im[b]);
      mag[b] = m;
      const diff = m - prev[b];
      if (diff > 0) sum += diff;
    }
    flux[f] = sum;
    prev = mag;
  }

  // Subtract a local mean so a loud passage doesn't dominate a quiet one —
  // what matters is a peak relative to its neighbourhood, not absolutely.
  const smoothed = new Float32Array(frames);
  const w = 16;
  for (let f = 0; f < frames; f++) {
    let acc = 0;
    let count = 0;
    for (let k = Math.max(0, f - w); k < Math.min(frames, f + w); k++) {
      acc += flux[k];
      count++;
    }
    smoothed[f] = Math.max(0, flux[f] - acc / count);
  }

  return { envelope: smoothed, hopSeconds: HOP / sampleRate };
}

const MIN_BPM = 70;
const MAX_BPM = 160;
/** Trailer music sits around here; weighting toward it resolves the
 * half/double-tempo ambiguity that autocorrelation cannot settle on its own. */
const BPM_PREFERENCE_CENTRE = 110;

/** Autocorrelation of the onset envelope. The lag with the strongest
 * self-similarity is the beat period. */
export function estimateTempo(envelope, hopSeconds) {
  const minLag = Math.floor(60 / MAX_BPM / hopSeconds);
  const maxLag = Math.ceil(60 / MIN_BPM / hopSeconds);
  if (envelope.length < maxLag * 2) return { bpm: null, confidence: 0 };

  let mean = 0;
  for (const v of envelope) mean += v;
  mean /= envelope.length;

  const scores = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    let acc = 0;
    for (let i = 0; i + lag < envelope.length; i++) {
      acc += (envelope[i] - mean) * (envelope[i + lag] - mean);
    }
    acc /= envelope.length - lag;
    const bpm = 60 / (lag * hopSeconds);
    // Gaussian preference in log-tempo space, so 60 and 240 are penalised
    // symmetrically against a centre of ~110.
    const octaveBias = Math.exp(-0.5 * Math.pow(Math.log2(bpm / BPM_PREFERENCE_CENTRE) / 0.7, 2));
    scores.push({ lag, bpm, score: acc * octaveBias });
  }

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  if (!best || best.score <= 0) return { bpm: null, confidence: 0 };

  // Confidence: how far the winner stands above the typical candidate.
  const mean2 = scores.reduce((s, c) => s + c.score, 0) / scores.length;
  const confidence = Math.max(0, Math.min(1, (best.score - mean2) / (best.score + 1e-9)));

  return { bpm: best.bpm, beatSeconds: best.lag * hopSeconds, confidence };
}

/** Ellis-style dynamic programming: choose the beat sequence maximising
 * onset strength while penalising deviation from the estimated period.
 * Picking peaks greedily gives a sequence that drifts; this stays in time. */
export function trackBeats(envelope, hopSeconds, beatSeconds) {
  const period = beatSeconds / hopSeconds;
  if (!Number.isFinite(period) || period < 2) return [];

  const n = envelope.length;
  const score = new Float64Array(n);
  const backlink = new Int32Array(n).fill(-1);
  const tightness = 100;

  let maxEnv = 0;
  for (const v of envelope) if (v > maxEnv) maxEnv = v;
  const norm = maxEnv > 0 ? 1 / maxEnv : 1;

  const searchFrom = Math.floor(period * 0.5);
  const searchTo = Math.ceil(period * 2);

  for (let i = 0; i < n; i++) {
    let bestScore = envelope[i] * norm;
    let bestPrev = -1;
    for (let d = searchFrom; d <= searchTo; d++) {
      const j = i - d;
      if (j < 0) break;
      // Log-Gaussian penalty: cheap near the expected period, expensive away
      // from it, and symmetric in ratio rather than in absolute frames.
      const penalty = -tightness * Math.pow(Math.log(d / period), 2);
      const candidate = score[j] + penalty + envelope[i] * norm;
      if (candidate > bestScore) {
        bestScore = candidate;
        bestPrev = j;
      }
    }
    score[i] = bestScore;
    backlink[i] = bestPrev;
  }

  let end = 0;
  for (let i = 1; i < n; i++) if (score[i] > score[end]) end = i;

  const beats = [];
  for (let i = end; i >= 0; i = backlink[i]) {
    beats.push(i * hopSeconds);
    if (backlink[i] === -1) break;
  }
  beats.reverse();

  // DP objective per beat — an independent read on quality from the
  // autocorrelation confidence.
  const strength = beats.length > 1 ? score[end] / beats.length : 0;
  return { beats, strength };
}

/** Which of the 4 positions in a bar carries the downbeat, judged by low-band
 * energy. On trailer music the impact is the loudest thing in the mix, which
 * makes this more reliable here than it would be on other material. */
export function estimateDownbeatPhase(beats, samples, sampleRate, meter = 4) {
  if (beats.length < meter * 2) return 0;
  const windowSamples = Math.floor(0.05 * sampleRate);
  const energyAt = (t) => {
    const start = Math.max(0, Math.floor(t * sampleRate));
    let acc = 0;
    for (let i = start; i < Math.min(samples.length, start + windowSamples); i++) {
      acc += samples[i] * samples[i];
    }
    return acc;
  };

  let bestPhase = 0;
  let bestScore = -Infinity;
  for (let phase = 0; phase < meter; phase++) {
    let acc = 0;
    for (let i = phase; i < beats.length; i += meter) acc += energyAt(beats[i]);
    const count = Math.ceil((beats.length - phase) / meter) || 1;
    const score = acc / count;
    if (score > bestScore) {
      bestScore = score;
      bestPhase = phase;
    }
  }
  return bestPhase;
}

/** Structural events from the loudness curve: where the track lifts, drops
 * away, and peaks. This is the layer that still works when beat tracking
 * does not, which is what makes graceful degradation possible. */
export function findEvents(energy, hopSeconds) {
  if (!energy.length) return [];
  const events = [];
  const smooth = (arr, w) => arr.map((_, i) => {
    let acc = 0;
    let n = 0;
    for (let k = Math.max(0, i - w); k < Math.min(arr.length, i + w); k++) {
      acc += arr[k];
      n++;
    }
    return acc / n;
  });

  const s = smooth(energy, 10);
  let peakIndex = 0;
  for (let i = 1; i < s.length; i++) if (s[i] > s[peakIndex]) peakIndex = i;
  events.push({ t: +(peakIndex * hopSeconds).toFixed(3), type: 'peak', strength: 1 });

  // A drop is a large positive step in smoothed loudness; a breakdown is the
  // mirror image. Threshold is relative to the track's own dynamic range, so
  // it travels across differently-mastered sources.
  const range = Math.max(...s) - Math.min(...s) || 1;
  const step = Math.round(1.5 / hopSeconds);
  for (let i = step; i < s.length - step; i++) {
    const delta = s[i + step] - s[i - step];
    const rel = delta / range;
    if (rel > 0.35) {
      const t = +(i * hopSeconds).toFixed(3);
      if (!events.some(e => e.type === 'drop' && Math.abs(e.t - t) < 6)) {
        events.push({ t, type: 'drop', strength: +Math.min(1, rel).toFixed(3) });
      }
    } else if (rel < -0.35) {
      const t = +(i * hopSeconds).toFixed(3);
      if (!events.some(e => e.type === 'breakdown' && Math.abs(e.t - t) < 6)) {
        events.push({ t, type: 'breakdown', strength: +Math.min(1, -rel).toFixed(3) });
      }
    }
  }

  return events.sort((a, b) => a.t - b.t);
}

/** Refines tempo from the tracked beat sequence.
 *
 * The autocorrelation tempo is quantized by the hop size: near 110bpm the
 * lags are 11.6ms apart, which is a resolution of about 2.4bpm. Extrapolating
 * a grid from a value that coarse drifts roughly two thirds of a second over
 * a minute — fatal for anything trying to land cuts on beats. (It is also why
 * several unrelated tracks report exactly the same bpm: they quantize to the
 * same lag.)
 *
 * The DP-tracked beats don't have that problem, because they follow real
 * onsets rather than an extrapolated period. Fitting a straight line through
 * beat index -> beat time recovers the true tempo at far better than hop
 * resolution, and gives the grid's phase at the same time. */
export function refineTempoFromBeats(beats) {
  if (!beats || beats.length < 8) return null;

  // Least-squares fit of t = slope * index + intercept.
  const n = beats.length;
  let sumI = 0, sumT = 0, sumII = 0, sumIT = 0;
  for (let i = 0; i < n; i++) {
    sumI += i;
    sumT += beats[i];
    sumII += i * i;
    sumIT += i * beats[i];
  }
  const denom = n * sumII - sumI * sumI;
  if (denom === 0) return null;

  const slope = (n * sumIT - sumI * sumT) / denom; // seconds per beat
  const intercept = (sumT - slope * sumI) / n; // time of beat 0
  if (!Number.isFinite(slope) || slope <= 0) return null;

  // How tightly the beats actually sit on that line. A track that speeds up
  // and slows down (much cinematic music does) will fit poorly, and that is
  // worth knowing before locking cuts to the grid.
  let sqErr = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    sqErr += (beats[i] - predicted) ** 2;
  }
  const rmsError = Math.sqrt(sqErr / n);

  return {
    bpm: 60 / slope,
    beatSeconds: slope,
    firstBeat: intercept,
    rmsErrorSeconds: rmsError,
    // Steady enough to extrapolate from, or only good locally?
    steady: rmsError < slope * 0.25,
  };
}

/** Confidence buckets. The governing asymmetry: a dissolve landing 200ms off
 * reads fine, a hard cut landing 200ms off reads broken. So low confidence
 * must soften the edit, not merely loosen the snapping. */
export function qualityLevel(confidence) {
  if (!Number.isFinite(confidence) || confidence <= 0) return 'none';
  if (confidence >= 0.6) return 'high';
  if (confidence >= 0.35) return 'medium';
  return 'low';
}
