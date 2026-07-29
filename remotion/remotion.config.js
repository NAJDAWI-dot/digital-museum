import { Config } from '@remotion/cli/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Share the site's own public/ folder (extracted project images live there
// as public/images/x-<hash>.jpg) instead of duplicating assets.
Config.setPublicDir('../public');
Config.setOverwriteOutput(true);

// Read from render-settings.json (edited by the local render control
// station), falling back to defaults if the file is missing or malformed —
// this file must never fail to evaluate just because that JSON got
// hand-edited badly.
//
// Resolved from cwd, NOT __dirname. The CLI evaluates this config with
// __dirname pointing at its own package directory
// (node_modules/@remotion/cli/dist), so the previous __dirname-based path
// silently missed the file on every render since it was written: hardware
// acceleration fell back to "disable", the image format to PNG, and a CRF
// got set that then conflicted with the --hardware-acceleration CLI flag.
// Every render command runs with cwd = remotion/ (npm scripts here, the
// Control Station's cwd: REMOTION_DIR, and the workflow's working-directory),
// so cwd is the reliable anchor.
//
// The failure is now loud. Defaulting quietly is what let a whole settings
// file sit unread through many renders.
const SETTINGS_PATH = join(process.cwd(), 'render-settings.json');
let renderSettings = {};
try {
  renderSettings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
} catch (err) {
  console.warn(`[remotion.config] Could not read ${SETTINGS_PATH} (${err.message}).`);
  console.warn('[remotion.config] Falling back to built-in defaults — Control Station render settings will NOT apply.');
  renderSettings = {};
}

// Highest-quality settings the offline render budget allows: lossless PNG
// intermediate frames (no JPEG artifacting baked into the Ken Burns/blur
// compositing) and a low CRF for the final H.264 encode (visually
// near-lossless; the default ~23 leaves visible banding in the ink/gold
// gradients this reel relies on).
Config.setVideoImageFormat(renderSettings.imageFormat ?? 'png');

// Intermediate frames are captured, encoded to this format, then handed to
// the encoder, so the format costs render time on every one of ~3600 frames.
// JPEG is faster and it is tempting — but measured end to end it is a bad
// trade for this reel, which is why imageFormat stays 'png':
//
//   png        17.4s/40 frames   94MB master   lossless
//   jpeg q100  15.8s/40 frames  122MB master   0.01% of pixels differ
//   jpeg q80   14.8s/40 frames        —        1.87% differ, max 47/255
//
// 9% faster costs a 29% bigger master, because h264 then spends bits
// faithfully encoding JPEG's ringing. Quality goes down and size goes up.
// The knob is honoured for anyone who wants that trade; the default does
// not take it. Ignored entirely when imageFormat is 'png'.
Config.setJpegQuality(renderSettings.jpegQuality ?? 90);

const hardwareAcceleration = renderSettings.hardwareAcceleration ?? 'disable';
Config.setHardwareAcceleration(hardwareAcceleration);

// @remotion/renderer hard-rejects `crf` whenever hardware acceleration is
// requested ("'crf' option is not supported with hardware acceleration").
// Hardware encoders don't implement CRF-style constant quality the way
// libx264 does, so quality has to be steered by target bitrate instead.
//
// On this machine 'disable' is the right setting, and not as a compromise:
// Remotion's BUNDLED ffmpeg has no h264_nvenc at all ("Hardware encoder
// h264_nvenc is not available in your FFmpeg build"), so GPU encoding is not
// on offer here whatever this says. Disabling it also re-enables CRF, which
// controls quality better than a fixed bitrate.
//
// Nothing is lost by that. Encoding is not where the render time goes:
// ~3600 frames take about 45 minutes to render and roughly 12 seconds to
// encode, so the whole encode stage is well under 1% of wall-clock. GPU
// encoding would be invisible on the clock. What does show up is the
// intermediate image format (see setJpegQuality above).
//
// The web-delivery encode is separate and DOES use the GPU — scripts/
// web-encode.mjs runs ffmpeg-static, which unlike Remotion's build does
// ship h264_nvenc.
if (hardwareAcceleration === 'disable') {
  Config.setCrf(renderSettings.masterCrf ?? 14);
} else {
  Config.setVideoBitrate(renderSettings.masterBitrate ?? '40M');
}
