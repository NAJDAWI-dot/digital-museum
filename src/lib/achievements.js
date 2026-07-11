// Visitor achievements — a small, dependency-free progress system stored
// entirely in this browser (localStorage). Components award achievements by
// calling award(id) or dispatching the museum:award CustomEvent; the
// VisitorDelight overlay listens and shows the toast. Nothing here touches
// any backend — a visitor's medals are theirs, on their device, like a
// stamped museum brochure.

const STORE_KEY = 'museum_achievements';
const PLAQUES_KEY = 'museum_plaques';

export const ACHIEVEMENTS = [
  { id: 'full-tour', icon: '🏛️', title: 'The Full Tour', hint: 'Visit every wing of the museum' },
  { id: 'historian', icon: '📜', title: 'The Historian', hint: 'Study the career timeline' },
  { id: 'signed', icon: '✒️', title: 'Left a Mark', hint: 'Sign the guestbook' },
  { id: 'film-buff', icon: '🎞️', title: 'Film Buff', hint: 'Watch the highlights reel to the end' },
  { id: 'plaque-hunter', icon: '🜲', title: 'Plaque Hunter', hint: 'Find all five brass plaques' },
  { id: 'archivist', icon: '🗝️', title: 'The Archivist', hint: 'Enter the Restricted Archives' },
];

export const TOTAL_PLAQUES = 5;

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

export function getEarned() {
  return read(STORE_KEY);
}

export function hasAchievement(id) {
  return Boolean(read(STORE_KEY)[id]);
}

/** Award once; returns true only the first time so callers can toast. */
export function award(id) {
  const earned = read(STORE_KEY);
  if (earned[id]) return false;
  earned[id] = Date.now();
  write(STORE_KEY, earned);
  const meta = ACHIEVEMENTS.find(a => a.id === id);
  window.dispatchEvent(new CustomEvent('museum:achievement', { detail: meta || { id } }));
  return true;
}

export function getPlaques() {
  return read(PLAQUES_KEY);
}

/** Collect a brass plaque (1–5). Awards plaque-hunter on the fifth. */
export function collectPlaque(id) {
  const found = read(PLAQUES_KEY);
  if (found[id]) return { collected: false, count: Object.keys(found).length };
  found[id] = Date.now();
  write(PLAQUES_KEY, found);
  const count = Object.keys(found).length;
  window.dispatchEvent(new CustomEvent('museum:plaque', { detail: { id, count, total: TOTAL_PLAQUES } }));
  if (count >= TOTAL_PLAQUES) award('plaque-hunter');
  return { collected: true, count };
}

export function huntComplete() {
  return Object.keys(read(PLAQUES_KEY)).length >= TOTAL_PLAQUES;
}
