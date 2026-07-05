import React, { useEffect, useState, useCallback } from 'react';
import './AnalyticsTab.css';

/**
 * Private analytics tab, backed by GoatCounter's read API.
 *
 * Degrades gracefully through three states:
 *   1. no site code yet        -> "configure in Settings" empty state, no network calls
 *   2. site code, no API token -> password-style token prompt (mirrors the GitHub PAT input)
 *   3. both present            -> fetch + render summary stats
 */
export default function AnalyticsTab({ goatcounterSiteCode, goatcounterApiToken, setGoatcounterApiToken }) {
  const [status, setStatus] = useState('idle'); // idle | loading | error | ready
  const [error, setError]   = useState('');
  const [stats, setStats]   = useState(null);    // { total, paths, refs }
  // Local draft for the token input — kept separate from the committed context value so that
  // typing (as opposed to a single paste) doesn't commit a new partial token on every keystroke.
  // Committing on every keystroke would change `goatcounterApiToken`, which changes `load`'s
  // identity below, which re-fires the fetch effect — hammering GoatCounter's API once per
  // character typed and tripping its real rate limit almost immediately.
  const [tokenDraft, setTokenDraft] = useState(goatcounterApiToken);

  const load = useCallback(async () => {
    if (!goatcounterSiteCode || !goatcounterApiToken) return;

    setStatus('loading');
    setError('');

    const base = `https://${goatcounterSiteCode}.goatcounter.com/api/v0`;
    // GoatCounter's API requires Content-Type: application/json on every request, GET
    // included — omitting it causes the server to reject the request before it even
    // gets to validating the token, which surfaces here as a misleading 401/403.
    const headers = { Authorization: `Bearer ${goatcounterApiToken}`, 'Content-Type': 'application/json' };

    const describeFailure = (res, label) => {
      if (res.status === 401 || res.status === 403) return `${label}: invalid or expired API token.`;
      if (res.status === 429) return `${label}: rate limited by GoatCounter — try again shortly.`;
      return `${label}: request failed (HTTP ${res.status}).`;
    };

    try {
      const [totalRes, hitsRes, refsRes] = await Promise.all([
        fetch(`${base}/stats/total`, { headers }),
        fetch(`${base}/stats/hits?limit=10`, { headers }),
        fetch(`${base}/stats/toprefs?limit=10`, { headers }),
      ]);

      if (!totalRes.ok) throw new Error(describeFailure(totalRes, 'Total stats'));
      if (!hitsRes.ok) throw new Error(describeFailure(hitsRes, 'Top paths'));
      if (!refsRes.ok) throw new Error(describeFailure(refsRes, 'Top referrers'));

      const [totalJson, hitsJson, refsJson] = await Promise.all([
        totalRes.json(), hitsRes.json(), refsRes.json(),
      ]);

      setStats({
        total: totalJson.total ?? 0,
        paths: hitsJson.hits ?? [],
        refs: refsJson.stats ?? [],
      });
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Could not reach GoatCounter — check your connection and try again.');
      setStatus('error');
    }
  }, [goatcounterSiteCode, goatcounterApiToken]);

  useEffect(() => { load(); }, [load]);

  /* ── State 1: no site code ── */
  if (!goatcounterSiteCode) {
    return (
      <div className="project-form">
        <div className="form-tabs">
          <button type="button" className="form-tab mono active">Analytics</button>
        </div>
        <div className="analytics-empty">
          <p className="section-label" style={{ marginBottom: '0.75rem' }}>GoatCounter Not Configured</p>
          <p className="mono analytics-empty-text">
            Add your GoatCounter site code in Settings first, then come back here to see traffic stats.
          </p>
        </div>
      </div>
    );
  }

  /* ── State 2: site code present, token missing ── */
  if (!goatcounterApiToken) {
    const connect = (e) => {
      e?.preventDefault();
      const trimmed = tokenDraft.trim();
      if (trimmed) setGoatcounterApiToken(trimmed);
    };
    return (
      <div className="project-form">
        <div className="form-tabs">
          <button type="button" className="form-tab mono active">Analytics</button>
        </div>
        <form className="form-section" style={{ marginTop: '1rem' }} onSubmit={connect}>
          <div className="form-group">
            <label className="form-label mono" htmlFor="gc-token">GoatCounter API Token</label>
            <input
              id="gc-token"
              type="password"
              placeholder="GoatCounter API token (read access)"
              className="admin-input mono"
              value={tokenDraft}
              onChange={(e) => setTokenDraft(e.target.value)}
              title="Paste a GoatCounter API token here, then press Connect to load private analytics. Stored only in this browser session."
            />
            <p className="mono analytics-hint">
              Generate one under your GoatCounter account's <em>Settings → API</em>. It is kept only in
              this browser tab's session storage and is never committed to the repo. Nothing is sent to
              GoatCounter until you press Connect — typing alone won't trigger any requests.
            </p>
            <button type="submit" className="form-btn-save mono" style={{ marginTop: '0.75rem' }} disabled={!tokenDraft.trim()}>
              Connect
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* ── State 3: fetching / error / ready ── */
  return (
    <div className="project-form">
      <div className="form-tabs">
        <button type="button" className="form-tab mono active">Analytics</button>
        <button
          type="button"
          className="form-tab mono analytics-refresh-btn"
          onClick={load}
          disabled={status === 'loading'}
          style={{ marginLeft: 'auto' }}
        >
          {status === 'loading' ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {status === 'loading' && !stats && (
        <p className="mono analytics-loading">Loading stats from {goatcounterSiteCode}.goatcounter.com…</p>
      )}

      {status === 'error' && (
        <div className="form-section" style={{ marginTop: '1rem' }}>
          <p className="admin-error mono">{error}</p>
        </div>
      )}

      {stats && (
        <div className="form-section" style={{ marginTop: '1.5rem', gap: '2rem' }}>
          <div className="analytics-total-tile">
            <span className="mono analytics-total-label">Total Pageviews</span>
            <span className="analytics-total-value serif">{stats.total.toLocaleString()}</span>
          </div>

          <div className="analytics-lists">
            <div className="analytics-list">
              <p className="section-label" style={{ marginBottom: '0.75rem' }}>Top Paths</p>
              {stats.paths.length === 0 && <p className="mono analytics-empty-text">No pageviews recorded yet.</p>}
              {stats.paths.map((hit) => (
                <div className="analytics-row" key={hit.path_id ?? hit.path}>
                  <span className="analytics-row-name">{hit.path}</span>
                  <span className="mono analytics-row-count">{hit.count.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="analytics-list">
              <p className="section-label" style={{ marginBottom: '0.75rem' }}>Top Referrers</p>
              {stats.refs.length === 0 && <p className="mono analytics-empty-text">No referrer data recorded yet.</p>}
              {stats.refs.map((ref) => (
                <div className="analytics-row" key={ref.id ?? ref.name}>
                  <span className="analytics-row-name">{ref.name || '(direct)'}</span>
                  <span className="mono analytics-row-count">{ref.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
