import React, { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '../../utils/supabaseClient';
import '../AdminPanel.css';

const TABLE = 'guestbook_entries';

// Moderation queue for the public guestbook: visitors submit without any
// sign-in, so every entry lands here as approved=false until the owner
// reviews it. Reads/writes rely on RLS policies scoped to the owner's own
// Supabase Auth session (the same session AdminPanel's login already
// establishes) -- a signed-out visitor's anon key cannot see pending rows
// at all, so this tab only ever shows real data when actually logged in.
export default function GuestbookModerationTab() {
  const supabase = getSupabaseClient();
  const [pending, setPending] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | error | ready
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setStatus('loading');
    setError('');
    const { data, error: fetchError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('approved', false)
      .order('created_at', { ascending: false });
    if (fetchError) { setError(fetchError.message); setStatus('error'); return; }
    setPending(data || []);
    setStatus('ready');
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    setBusyId(id);
    const { error: updateError } = await supabase.from(TABLE).update({ approved: true }).eq('id', id);
    setBusyId(null);
    if (updateError) { setError(updateError.message); return; }
    setPending((prev) => prev.filter((e) => e.id !== id));
  };

  const reject = async (id) => {
    setBusyId(id);
    const { error: deleteError } = await supabase.from(TABLE).delete().eq('id', id);
    setBusyId(null);
    if (deleteError) { setError(deleteError.message); return; }
    setPending((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="project-form">
      <div className="form-tabs">
        <button type="button" className="form-tab mono active">Guestbook</button>
        <button
          type="button"
          className="form-tab mono"
          onClick={load}
          disabled={status === 'loading'}
          style={{ marginLeft: 'auto' }}
        >
          {status === 'loading' ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      <div className="form-section" style={{ marginTop: '1rem' }}>
        {!supabase && (
          <p className="mono" style={{ opacity: 0.5 }}>Guestbook not configured yet.</p>
        )}

        {supabase && error && <p className="admin-error mono">{error}</p>}

        {supabase && status === 'ready' && pending.length === 0 && (
          <p className="mono" style={{ opacity: 0.5 }}>No entries waiting for review.</p>
        )}

        {supabase && pending.map((entry) => (
          <div
            key={entry.id}
            style={{
              padding: '1rem',
              marginBottom: '0.75rem',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="mono" style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>{entry.display_name}</span>
              <span className="mono" style={{ color: 'var(--dust)', fontSize: '0.65rem' }}>
                {new Date(entry.created_at).toLocaleString()}
              </span>
            </div>
            <p style={{ color: 'var(--linen)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '0.75rem', whiteSpace: 'pre-wrap' }}>
              {entry.message}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="form-btn-save mono"
                disabled={busyId === entry.id}
                onClick={() => approve(entry.id)}
              >
                Approve
              </button>
              <button
                type="button"
                className="admin-reset-btn mono"
                disabled={busyId === entry.id}
                onClick={() => reject(entry.id)}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
