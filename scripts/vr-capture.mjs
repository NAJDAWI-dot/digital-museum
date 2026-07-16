// Visual-regression capture + compare for the live site. Used by
// .github/workflows/visual-regression.yml — deps (playwright, pixelmatch,
// pngjs) are installed ad hoc there, not in package.json, so local
// `npm ci` stays lean.
//
//   node scripts/vr-capture.mjs shoot out.png       capture the live page
//   node scripts/vr-capture.mjs compare a.png b.png diff.png
//     → prints "diff=<ratio>" and exits 0; exit 2 when images differ in size
//
// Determinism: reduced motion is emulated (the site's MotionConfig
// respects it, so reveals render settled), and inherently dynamic chrome
// (cursor, cat, toasts, live counters, videos) is hidden via injected CSS.
import fs from 'node:fs';

const HIDE_CSS = `
  .cursor-dot, .cursor-ring, .museum-cat, .delight-toasts,
  .likes-count, video { visibility: hidden !important; }
  *, *::before, *::after {
    animation-duration: 0.001s !important;
    transition-duration: 0.001s !important;
    caret-color: transparent !important;
  }
`;

const SITE_URL = process.env.SITE_URL || 'https://najdawi-dot.github.io/digital-museum/';

async function shoot(outPath) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  });
  await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
  // Let the preloader hand off (it exits on its own schedule) and lazy
  // sections settle.
  await page.waitForSelector('.preloader', { state: 'detached', timeout: 30_000 }).catch(() => {});
  await page.addStyleTag({ content: HIDE_CSS });
  // Walk the page so IntersectionObserver-gated content mounts, then
  // return to the top for a stable full-page shot.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 800) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
  console.log(`captured ${outPath}`);
}

async function compare(aPath, bPath, diffPath) {
  const { PNG } = await import('pngjs');
  const { default: pixelmatch } = await import('pixelmatch');
  const a = PNG.sync.read(fs.readFileSync(aPath));
  const b = PNG.sync.read(fs.readFileSync(bPath));
  if (a.width !== b.width || a.height !== b.height) {
    // Page height changes with content edits — that is drift by definition.
    console.log(`diff=1 (size ${a.width}x${a.height} vs ${b.width}x${b.height})`);
    process.exit(2);
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const mismatched = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.15 });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  const ratio = mismatched / (a.width * a.height);
  console.log(`diff=${ratio.toFixed(5)}`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'shoot') await shoot(args[0] || 'shot.png');
else if (cmd === 'compare') await compare(args[0], args[1], args[2] || 'diff.png');
else {
  console.error('usage: vr-capture.mjs shoot <out.png> | compare <a.png> <b.png> [diff.png]');
  process.exit(1);
}
