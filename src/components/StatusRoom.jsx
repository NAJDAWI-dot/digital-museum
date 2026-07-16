import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './StatusRoom.css';

// The Status Room: live health of the museum's machinery, read straight from
// the `status` branch that the Watchdog workflow maintains (status.json is
// the latest sweep, history.jsonl the last ~1000 hourly sweeps). Opened from
// the footer via the `museum:open-status` event — same pattern as the ticket.

const RAW_BASE = 'https://raw.githubusercontent.com/NAJDAWI-dot/digital-museum/status';

const SYSTEMS = [
  { key: 'site', label: 'Gallery doors', hint: 'the site itself' },
  { key: 'db', label: "Visitors' log", hint: 'guestbook database' },
  { key: 'counters', label: 'Turnstiles', hint: 'visitor & like counters' },
  { key: 'runner', label: 'Projection room', hint: 'video render engine' },
  { key: 'links', label: 'Corridors', hint: 'no dead links' },
  { key: 'vr', label: 'Curation', hint: 'the museum looks as intended' },
];

const STATE_LABEL = {
  ok: 'Open',
  down: 'Closed',
  broken: 'Needs repair',
  drift: 'Rehung',
  unknown: 'Unstaffed',
};

function formatAge(iso) {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'moments ago';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

function Sparkline({ points }) {
  if (points.length < 2) return null;
  const W = 260, H = 48, PAD = 2;
  const max = Math.max(...points, 0.5);
  const step = (W - PAD * 2) / (points.length - 1);
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(PAD + i * step).toFixed(1)},${(H - PAD - (v / max) * (H - PAD * 2)).toFixed(1)}`)
    .join(' ');
  return (
    <svg className="status-spark" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Response time over the last ${points.length} checks, currently ${Math.round(points[points.length - 1] * 1000)} milliseconds`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function StatusRoom() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('museum:open-status', onOpen);
    return () => window.removeEventListener('museum:open-status', onOpen);
  }, []);

  useEffect(() => {
    if (!open || status) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, h] = await Promise.all([
          fetch(`${RAW_BASE}/status.json`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : Promise.reject())),
          fetch(`${RAW_BASE}/history.jsonl`, { cache: 'no-store' }).then(r => (r.ok ? r.text() : '')),
        ]);
        if (cancelled) return;
        setStatus(s);
        setHistory(
          h.trim().split('\n').filter(Boolean).slice(-72)
            .map(line => { try { return JSON.parse(line); } catch { return null; } })
            .filter(Boolean),
        );
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [open, status]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const ttfbSeries = useMemo(
    () => history.map(e => Number(e.ttfb)).filter(v => Number.isFinite(v) && v > 0),
    [history],
  );
  const uptime = useMemo(() => {
    const relevant = history.filter(e => e.site === 'ok' || e.site === 'down');
    if (!relevant.length) return null;
    return Math.round((relevant.filter(e => e.site === 'ok').length / relevant.length) * 1000) / 10;
  }, [history]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="status-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="status-room"
            role="dialog"
            aria-modal="true"
            aria-label="Museum status room"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="status-kicker mono">Back of house</p>
            <h3 className="status-title serif">The Status Room</h3>

            {failed && (
              <p className="status-empty">
                The logbook is unreachable right now — the museum itself is
                evidently open, since you're reading this.
              </p>
            )}
            {!failed && !status && <p className="status-empty">Consulting the logbook…</p>}

            {status && (
              <>
                <ul className="status-grid">
                  {SYSTEMS.map(({ key, label, hint }) => {
                    const state = status[key] || 'unknown';
                    return (
                      <li key={key} className={`status-cell is-${state}`}>
                        <span className="status-lamp" aria-hidden="true" />
                        <span className="status-cell-label">{label}</span>
                        <span className="status-cell-state mono">{STATE_LABEL[state] || state}</span>
                        <span className="status-cell-hint">{hint}</span>
                      </li>
                    );
                  })}
                </ul>

                <div className="status-meta">
                  {ttfbSeries.length > 1 && (
                    <div className="status-meta-block">
                      <p className="status-meta-label mono">Response time · last {ttfbSeries.length} checks</p>
                      <Sparkline points={ttfbSeries} />
                    </div>
                  )}
                  <div className="status-meta-figures mono">
                    {uptime !== null && <span>{uptime}% uptime</span>}
                    {status.backupAt && <span>backup {formatAge(status.backupAt)}</span>}
                    {status.checkedAt && <span>inspected {formatAge(status.checkedAt)}</span>}
                  </div>
                </div>
              </>
            )}

            <button type="button" className="status-close mono" onClick={() => setOpen(false)}>
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
