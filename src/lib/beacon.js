// Error beacon: reports uncaught errors and unhandled promise rejections to
// the Supabase `site_errors` table (see supabase/migrations/site_errors.sql —
// anon key can INSERT only, never read). The admin app surfaces the counts.
//
// Deliberately tiny and dependency-free (raw fetch, not supabase-js) so a
// broken bundle elsewhere can't take the reporter down with it. No PII: we
// send the error text, where it happened, and coarse context — never input
// values, storage contents, or identifiers.

const MAX_REPORTS_PER_SESSION = 5;
const seen = new Set();
let sent = 0;

function endpoint() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: `${url}/rest/v1/site_errors`, key };
}

function report(kind, message, source) {
  const ep = endpoint();
  if (!ep) return;
  const msg = String(message || 'unknown').slice(0, 500);
  // Dedupe within the session — a render loop throwing 60×/s is one bug.
  const fingerprint = `${kind}:${msg}`;
  if (seen.has(fingerprint) || sent >= MAX_REPORTS_PER_SESSION) return;
  seen.add(fingerprint);
  sent += 1;

  const body = JSON.stringify({
    kind,
    message: msg,
    source: String(source || '').slice(0, 300),
    url: location.pathname + location.hash,
    ua: navigator.userAgent.slice(0, 200),
    viewport: `${innerWidth}x${innerHeight}`,
  });

  // fetch with keepalive so reports survive page unload; failures are
  // swallowed — the beacon must never become an error source itself.
  fetch(ep.url, {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      apikey: ep.key,
      Authorization: `Bearer ${ep.key}`,
      Prefer: 'return=minimal',
    },
    body,
  }).catch(() => {});
}

export function installBeacon() {
  if (!endpoint()) return;
  window.addEventListener('error', (e) => {
    // Resource load failures (img/script) fire error events with no .error —
    // those are network noise, not code bugs.
    if (!e.error && !e.message) return;
    report('error', e.message, e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : '');
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    report('rejection', r?.message || r, r?.stack?.split('\n')[1]?.trim() || '');
  });
}
