// Pulls the numbers that live outside src/data/projects.js — guestbook
// signatures (Supabase) and appreciation counts (CounterAPI) — into a JSON
// snapshot the reel reads at render time. Run before every render so the
// reel's stats slide is as fresh as its project data.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { INITIAL_PROJECTS } from '../../src/data/projects.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '../src/live-stats.json');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const COUNTER_NAMESPACE = 'najdawi-museum';

async function fetchGuestbookStats() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase env vars not set — guestbook stats will be zero.');
    return { count: 0, names: [], quotes: [] };
  }
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/guestbook_entries?select=id&approved=eq.true`,
    { headers: { ...headers, Prefer: 'count=exact' } }
  );
  const range = countRes.headers.get('content-range'); // "0-9/42"
  const count = range ? Number(range.split('/')[1]) : 0;

  // All signatures, not just the latest — the guestbook slide shows every
  // name, and grows as more visitors sign, the same way the volunteering
  // slide grows with every new entry. No practical guestbook has enough
  // entries to be a real payload concern (Supabase returns 1000 rows max
  // per request by default anyway).
  const namesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/guestbook_entries?select=display_name,message&approved=eq.true&order=created_at.desc`,
    { headers }
  );
  const rows = namesRes.ok ? await namesRes.json() : [];
  const names = rows.map(r => r.display_name).filter(Boolean);
  // A couple of short quotes for the featured-quote flourish underneath the wall.
  const quotes = rows
    .filter(r => r.message && r.message.length <= 140)
    .slice(0, 3)
    .map(r => ({ name: r.display_name, message: r.message }));

  return { count, names, quotes };
}

async function getCounterValue(key) {
  try {
    const res = await fetch(`https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${key}/`);
    const data = await res.json();
    if (res.ok && typeof data.count === 'number') return Math.max(0, data.count);
    return 0;
  } catch {
    return 0;
  }
}

async function fetchTotalLikes() {
  const keys = [...INITIAL_PROJECTS.map(p => p.id), 'cv-downloads'];
  const counts = await Promise.all(keys.map(getCounterValue));
  return counts.reduce((sum, n) => sum + n, 0);
}

async function main() {
  const [guestbook, totalLikes] = await Promise.all([
    fetchGuestbookStats(),
    fetchTotalLikes(),
  ]);

  const stats = {
    guestbookCount: guestbook.count,
    guestbookNames: guestbook.names,
    guestbookQuotes: guestbook.quotes,
    totalLikes,
    generatedAt: new Date().toISOString(),
  };

  await writeFile(OUT_PATH, JSON.stringify(stats, null, 2));
  console.log('Wrote live-stats.json:', stats);
}

main().catch(e => {
  console.error('fetch-live-stats failed:', e);
  process.exit(1);
});
