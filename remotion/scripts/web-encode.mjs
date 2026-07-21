// Re-encodes a rendered master into a web-delivery version: H.264 (CRF/
// preset/audio bitrate read from render-settings.json, default CRF 22 —
// visually transparent for screen content at a fraction of the master's
// size), faststart moov so playback begins before the download finishes.
// The archival-quality master itself is kept as a workflow artifact, not
// committed — visitors' phones shouldn't pay for archival bitrate.
//
// webEncoder in render-settings.json can be "h264_nvenc" instead of the
// libx264 default — on a machine with an NVIDIA GPU (confirmed present:
// RTX 4070) this is dramatically faster since it's hardware, not software,
// encoding. NVENC's own preset p7 ("slowest (best quality)") plus constant-
// quality VBR mode (-cq mapped from the same webCrf value) targets
// comparable visual quality to libx264 at the configured CRF, not just raw
// speed — falls back to libx264 automatically if h264_nvenc isn't usable.
//
// Usage: node scripts/web-encode.mjs <input.mp4> <output.mp4>
import { execFileSync } from 'node:child_process';
import { statSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read from render-settings.json (edited by the local render control
// station), falling back to today's defaults — same pattern select-score.mjs
// already uses for reel-config.json.
let renderSettings = {};
try {
  renderSettings = JSON.parse(readFileSync(join(__dirname, '..', 'render-settings.json'), 'utf8'));
} catch { /* no config — use defaults below */ }

const webCrf = String(renderSettings.webCrf ?? 22);
const webPreset = renderSettings.webPreset ?? 'slow';
const audioBitrate = `${renderSettings.audioBitrateKbps ?? 128}k`;
const useNvenc = renderSettings.webEncoder === 'h264_nvenc';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/web-encode.mjs <input.mp4> <output.mp4>');
  process.exit(1);
}

const videoArgs = useNvenc
  ? ['-c:v', 'h264_nvenc', '-preset', 'p7', '-tune', 'hq', '-rc', 'vbr', '-cq', webCrf, '-b:v', '0']
  : ['-c:v', 'libx264', '-crf', webCrf, '-preset', webPreset];

function encode(videoArgs) {
  execFileSync(ffmpegPath, [
    '-y',
    '-i', input,
    ...videoArgs,
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-c:a', 'aac',
    '-b:a', audioBitrate,
    output,
  ], { stdio: 'inherit' });
}

try {
  encode(videoArgs);
} catch (err) {
  if (!useNvenc) throw err;
  console.warn('h264_nvenc encode failed — falling back to libx264.');
  encode(['-c:v', 'libx264', '-crf', webCrf, '-preset', webPreset]);
}
