import { staticFile } from 'remotion';

// Mirrors src/lib/assets.js's resolveAsset — repo-relative paths
// ("images/x-<hash>.jpg") resolve through Remotion's public dir (configured
// in remotion.config.mjs to point at the site's own public/ folder, so
// extracted images are used directly with no duplication). Base64 data URIs
// (a screenshot just added, not yet extracted by the deploy workflow) and
// absolute URLs pass through unchanged.
export function resolveAsset(src) {
  if (!src) return src;
  if (src.startsWith('data:') || /^https?:\/\//.test(src)) return src;
  return staticFile(src);
}

export function isRealLink(href) {
  return Boolean(href) && href !== '#';
}
