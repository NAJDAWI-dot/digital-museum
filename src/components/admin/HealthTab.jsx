import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../utils/supabaseClient';
import './HealthTab.css';

// Owner-facing health dashboard. Reads the same status branch the public
// Status Room does, but adds the private layers: site_errors rows from
// Supabase (authenticated-only RLS), the broken-link report, and one-click
// rollback via deploy.yml's workflow_dispatch sha input (same PAT the
// editor already holds for content commits).

const RAW_BASE = 'https://raw.githubusercontent.com/NAJDAWI-dot/digital-museum/status';
const REPO_API = 'https://api.github.com/repos/NAJDAWI-dot/digital-museum';

const SYSTEMS = [
  { key: 'site', label: 'Site' },
  { key: 'db', label: 'Database' },
  { key: 'counters', label: 'Counters' },
  { key: 'runner', label: 'Render runner' },
  { key: 'links', label: 'Links' },
  { key: 'vr', label: 'Visual' },
];

function timeAgo(iso) {
  if (!iso) return '—';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

function Sparkline({ points }) {
  if (points.length < 2) return null;
  const W = 220, H = 36, PAD = 2;
  const max = Math.max(...points, 0.5);
  const step = (W - PAD * 2) / (points.length - 1);
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(PAD + i * step).toFixed(1)},${(H - PAD - (v / max) * (H - PAD * 2)).toFixed(1)}`)
    .join(' ');
  return (
    <svg className="health-spark" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Response time, currently ${Math.round(points[points.length - 1] * 1000)} ms`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function HealthTab({ githubToken }) {
  const supabase = getSupabaseClient();
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [links, setLinks] = useState(null);
  const [errors, setErrors] = useState(null);   // null = loading, [] = none
  const [errorsMsg, setErrorsMsg] = useState('');
  const [deploys, setDeploys] = useState([]);
  const [deploysMsg, setDeploysMsg] = useState('');
  const [rollback, setRollback] = useState({ sha: null, state: 'idle' }); // idle | busy | done | fail
  const [clearing, setClearing] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const [s, h, l] = await Promise.all([
        fetch(`${RAW_BASE}/status.json`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)),
        fetch(`${RAW_BASE}/history.jsonl`, { cache: 'no-store' }).then(r => (r.ok ? r.text() : '')),
        fetch(`${RAW_BASE}/links.json`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      setStatus(s);
      setLinks(l);
      setHistory(
        h.trim().split('\n').filter(Boolean).slice(-72)
          .map(line => { try { return JSON.parse(line); } catch { return null; } })
          .filter(Boolean),
      );
    } catch {
      setStatus(false); // distinguishes "fetch failed" from "still loading"
    }
  }, []);

  const loadErrors = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('site_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) { setErrorsMsg(error.message); setErrors([]); return; }
    setErrorsMsg('');
    setErrors(data || []);
  }, [supabase]);

  const loadDeploys = useCallback(async () => {
    if (!githubToken) return;
    try {
      const res = await fetch(
        `${REPO_API}/actions/workflows/deploy.yml/runs?status=success&per_page=8`,
        { headers: { Authorization: `Bearer ${githubToken}` } },
      );
      if (!res.ok) throw new Error(`GitHub API: HTTP ${res.status}`);
      const json = await res.json();
      setDeploysMsg('');
      setDeploys(
        (json.workflow_runs || [])
          // A rollback dispatch re-runs an old sha; showing it as "a deploy"
          // is still correct — it's what's live.
          .map(r => ({
            sha: r.head_sha,
            message: (r.head_commit?.message || r.display_title || '').split('\n')[0],
            at: r.updated_at,
          })),
      );
    } catch (e) {
      setDeploysMsg(e.message);
    }
  }, [githubToken]);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { loadErrors(); }, [loadErrors]);
  useEffect(() => { loadDeploys(); }, [loadDeploys]);

  const doRollback = async (sha) => {
    if (!githubToken || rollback.state === 'busy') return;
    if (!confirm(`Redeploy the site at commit ${sha.slice(0, 7)}? The live site will be replaced in ~1 minute.`)) return;
    setRollback({ sha, state: 'busy' });
    try {
      const res = await fetch(`${REPO_API}/actions/workflows/deploy.yml/dispatches`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${githubToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: 'main', inputs: { sha } }),
      });
      setRollback({ sha, state: res.status === 204 ? 'done' : 'fail' });
    } catch {
      setRollback({ sha, state: 'fail' });
    }
    setTimeout(() => setRollback({ sha: null, state: 'idle' }), 8000);
  };

  const clearErrors = async () => {
    if (!supabase || clearing || !errors?.length) return;
    if (!confirm(`Delete all ${errors.length} recorded errors?`)) return;
    setClearing(true);
    // gt(0) — PostgREST refuses an unfiltered DELETE.
    const { error } = await supabase.from('site_errors').delete().gt('id', 0);
    setClearing(false);
    if (error) { setErrorsMsg(error.message); return; }
    setErrors([]);
  };

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
    <div className="project-form">
      <div className="form-tabs">
        <button type="button" className="form-tab mono active">Health</button>
        <button
          type="button"
          className="form-tab mono"
          style={{ marginLeft: 'auto' }}
          onClick={() => { setStatus(null); setErrors(null); loadStatus(); loadErrors(); loadDeploys(); }}
        >
          ↻ Refresh
        </button>
      </div>

      <div className="form-section health-root">
        {/* ── Systems board ── */}
        {status === null && <p className="mono health-muted">Loading status…</p>}
        {status === false && <p className="admin-error mono">Could not reach the status branch.</p>}
        {status && (
          <>
            <ul className="health-grid">
              {SYSTEMS.map(({ key, label }) => {
                const state = status[key] || 'unknown';
                return (
                  <li key={key} className={`health-cell is-${state}`}>
                    <span className="health-lamp" aria-hidden="true" />
                    <span className="health-cell-label">{label}</span>
                    <span className="health-cell-state mono">{state}</span>
                  </li>
                );
              })}
            </ul>
            <div className="health-figures mono">
              {uptime !== null && <span>{uptime}% uptime</span>}
              {status.siteTtfb > 0 && <span>{Math.round(status.siteTtfb * 1000)} ms TTFB</span>}
              {status.backupAt && <span>backup {timeAgo(status.backupAt)}</span>}
              <span>checked {timeAgo(status.checkedAt)}</span>
            </div>
            {ttfbSeries.length > 1 && <Sparkline points={ttfbSeries} />}
          </>
        )}

        {/* ── Broken links ── */}
        {links?.broken?.length > 0 && (
          <div className="health-block">
            <p className="section-label">Broken links ({links.broken.length})</p>
            <ul className="health-list">
              {links.broken.map((b, i) => (
                <li key={i} className="mono">
                  <span className="health-err-kind">{b.status}</span> {b.url}
                  {b.parent && <span className="health-muted"> ← {b.parent}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Visitor-facing errors ── */}
        <div className="health-block">
          <div className="health-block-head">
            <p className="section-label">Visitor errors {errors ? `(${errors.length})` : ''}</p>
            {errors?.length > 0 && (
              <button type="button" className="admin-reset-btn mono" disabled={clearing} onClick={clearErrors}>
                {clearing ? 'Clearing…' : 'Clear all'}
              </button>
            )}
          </div>
          {!supabase && <p className="mono health-muted">Supabase not configured.</p>}
          {supabase && errorsMsg && <p className="admin-error mono">{errorsMsg}</p>}
          {supabase && errors === null && !errorsMsg && <p className="mono health-muted">Loading…</p>}
          {supabase && errors?.length === 0 && !errorsMsg && (
            <p className="mono health-muted">No errors recorded — the beacon is quiet.</p>
          )}
          {errors?.length > 0 && (
            <ul className="health-list">
              {errors.map(e => (
                <li key={e.id}>
                  <div className="mono health-err-meta">
                    <span className="health-err-kind">{e.kind}</span>
                    <span>{timeAgo(e.created_at)}</span>
                    {e.url && <span>{e.url}</span>}
                    {e.viewport && <span>{e.viewport}</span>}
                  </div>
                  <p className="health-err-msg">{e.message}</p>
                  {e.source && <p className="mono health-muted health-err-src">{e.source}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Rollback ── */}
        <div className="health-block">
          <p className="section-label">Deploys &amp; rollback</p>
          {!githubToken && (
            <p className="mono health-muted">
              Paste your GitHub PAT in the top bar to list recent deploys and roll back.
            </p>
          )}
          {githubToken && deploysMsg && <p className="admin-error mono">{deploysMsg}</p>}
          {githubToken && !deploysMsg && deploys.length === 0 && (
            <p className="mono health-muted">Loading deploys…</p>
          )}
          {deploys.length > 0 && (
            <ul className="health-list health-deploys">
              {deploys.map((d, i) => (
                <li key={d.sha + d.at}>
                  <div className="health-deploy-info">
                    <span className="mono health-deploy-sha">{d.sha.slice(0, 7)}</span>
                    <span className="health-deploy-msg">{d.message}</span>
                    <span className="mono health-muted">{timeAgo(d.at)}{i === 0 ? ' · live' : ''}</span>
                  </div>
                  {i > 0 && (
                    <button
                      type="button"
                      className="admin-reset-btn mono"
                      disabled={rollback.state === 'busy'}
                      onClick={() => doRollback(d.sha)}
                    >
                      {rollback.sha === d.sha && rollback.state === 'busy' && 'Dispatching…'}
                      {rollback.sha === d.sha && rollback.state === 'done' && '✓ Deploying'}
                      {rollback.sha === d.sha && rollback.state === 'fail' && '✗ Failed'}
                      {(rollback.sha !== d.sha || rollback.state === 'idle') && 'Roll back to this'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
