import { Config } from '@remotion/cli/config';

// Share the site's own public/ folder (extracted project images live there
// as public/images/x-<hash>.jpg) instead of duplicating assets. Resolved
// relative to this config file's directory (remotion/). Can't use
// import.meta.url here — the CLI evaluates this file as CJS, where
// import.meta is empty.
Config.setPublicDir('../public');
Config.setOverwriteOutput(true);

// Highest-quality settings the offline render budget allows: lossless PNG
// intermediate frames (no JPEG artifacting baked into the Ken Burns/blur
// compositing) and a low CRF for the final H.264 encode (visually
// near-lossless; the default ~23 leaves visible banding in the ink/gold
// gradients this reel relies on).
Config.setVideoImageFormat('png');
Config.setCrf(14);
