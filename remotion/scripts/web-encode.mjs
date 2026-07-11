// Re-encodes a rendered master into a web-delivery version: H.264 CRF 22
// (visually transparent for screen content at a fraction of the CRF-14
// master's size), faststart moov so playback begins before the download
// finishes, AAC 128k audio. The archival-quality master itself is kept as
// a workflow artifact, not committed — visitors' phones shouldn't pay for
// archival bitrate.
//
// Usage: node scripts/web-encode.mjs <input.mp4> <output.mp4>
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import ffmpegPath from 'ffmpeg-static';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/web-encode.mjs <input.mp4> <output.mp4>');
  process.exit(1);
}

execFileSync(ffmpegPath, [
  '-y',
  '-i', input,
  '-c:v', 'libx264',
  '-crf', '22',
  '-preset', 'slow',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  '-c:a', 'aac',
  '-b:a', '128k',
  output,
], { stdio: 'inherit' });

const inMb = (statSync(input).size / 1e6).toFixed(1);
const outMb = (statSync(output).size / 1e6).toFixed(1);
console.log(`Web encode: ${inMb} MB -> ${outMb} MB (${output})`);
