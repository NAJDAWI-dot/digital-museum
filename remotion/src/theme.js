// Edited by the local render control station; each read below falls back
// to today's default via `??` so a missing/stripped key never breaks a
// render — only remotion.config.js and web-encode.mjs need a real
// try/catch (they're read outside the webpack-bundled ESM graph this file
// lives in).
import renderSettings from '../render-settings.json';

// Mirrors the site's own design tokens (src/index.css :root) exactly, so
// the reel reads as part of the same brand, not a separate export.
export const COLORS = {
  ink: '#0d0d0d',
  inkLight: '#1a1a1a',
  inkMid: '#2e2e2e',
  silver: '#8a8a8a',
  dust: '#9a9a9a',
  mist: '#c8c8c8',
  linen: '#f0ede8',
  paper: '#f8f6f2',
  white: '#ffffff',
  gold: '#c9a96e',
  goldLight: '#dfc28f',
  goldDark: '#a8823e',
};

export const EASE_SMOOTH = [0.16, 1, 0.3, 1];
export const EASE_PRECISE = [0.4, 0, 0.2, 1];

export const FPS = renderSettings.fps ?? 60;
export const WIDTH = renderSettings.width ?? 1920;
export const HEIGHT = renderSettings.height ?? 1080;
