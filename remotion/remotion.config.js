import { Config } from '@remotion/cli/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Share the site's own public/ folder (extracted project images live there
// as public/images/x-<hash>.jpg) instead of duplicating assets. Resolved
// relative to this config file's directory (remotion/). Can't use
// import.meta.url here — the CLI evaluates this file as CJS, where
// import.meta is empty. __dirname is available instead (Node's CJS global).
Config.setPublicDir('../public');
Config.setOverwriteOutput(true);

// Read from render-settings.json (edited by the local render control
// station), falling back to today's defaults if the file is missing or
// malformed — this file must never fail to evaluate just because that
// JSON got hand-edited badly.
let renderSettings = {};
try {
  renderSettings = JSON.parse(readFileSync(join(__dirname, 'render-settings.json'), 'utf8'));
} catch {
  renderSettings = {};
}

// Highest-quality settings the offline render budget allows: lossless PNG
// intermediate frames (no JPEG artifacting baked into the Ken Burns/blur
// compositing) and a low CRF for the final H.264 encode (visually
// near-lossless; the default ~23 leaves visible banding in the ink/gold
// gradients this reel relies on).
Config.setVideoImageFormat(renderSettings.imageFormat ?? 'png');

const hardwareAcceleration = renderSettings.hardwareAcceleration ?? 'disable';
Config.setHardwareAcceleration(hardwareAcceleration);

// @remotion/renderer hard-rejects `crf` whenever hardware acceleration is
// requested ("'crf' option is not supported with hardware acceleration") —
// confirmed by hitting this exact error with hardwareAcceleration:
// "required". NVENC (and hardware encoders generally) don't implement
// CRF-style constant-quality the way libx264 does, so quality has to be
// steered via an explicit target bitrate instead whenever GPU encoding is
// requested — this is what actually lets --hardware-acceleration engage
// for the master render, not just fail closed or silently no-op.
if (hardwareAcceleration === 'disable') {
  Config.setCrf(renderSettings.masterCrf ?? 14);
} else {
  Config.setVideoBitrate(renderSettings.masterBitrate ?? '40M');
}
