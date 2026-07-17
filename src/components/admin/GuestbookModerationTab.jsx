import React, { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '../../utils/supabaseClient';
import '../AdminPanel.css';

const TABLE = 'guestbook_entries';

// Moderation for the public guestbook: visitors submit without any sign-in,
// so every entry lands as approved=false until the owner reviews it. This
// tab shows both queues — pending (approve/reject) and published (remove) —
// so a sign can be taken down after the fact too. Reads/writes rely on RLS
// policies scoped to the owner's own Supabase Auth session (the same
// session AdminPanel's login already establishes); a signed-out visitor's
// anon key cannot see pending rows or delete anything.

function EntryCard({ entry, actions }) {
  return (
    <div
      style={{
        padding: '1rem',
        marginBottom: '0.75rem',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '6px',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <span className="mono" style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>{entry.display_name}</span>
        <span className="mono" style={{ color: 'var(--dust)', fontSize: '0.65rem' }}>
          {new Date(entry.created_at).toLocaleString()}
        </span>
      </div>
      <p style={{ color: 'var(--linen)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '0.75rem', whiteSpace: 'pre-wrap' }}>
        {entry.message}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{actions}</div>
    </div>
  );
}

export default function GuestbookModerationTab() {
  const supabase = getSupabaseClient();
  const [pending, setPending] = useState([]);
  const [published, setPublished] = useState([]);
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
      .order('created_at', { ascending: false });
    if (fetchError) { setError(fetchError.message); setStatus('error'); return; }
    setPending((data || []).filter((e) => !e.approved));
    setPublished((data || []).filter((e) => e.approved));
    setStatus('ready');
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    setBusyId(id);
    const { error: updateError } = await supabase.from(TABLE).update({ approved: true }).eq('id', id);
    setBusyId(null);
    if (updateError) { setError(updateError.message); return; }
    setPending((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) setPublished((pub) => [{ ...entry, approved: true }, ...pub]);
      return prev.filter((e) => e.id !== id);
    });
  };

  const remove = async (id, { confirmFirst = false, label = 'entry' } = {}) => {
    if (confirmFirst && !confirm(`Remove this ${label} from the guestbook? This can't be undone.`)) return;
    setBusyId(id);
    const { error: deleteError } = await supabase.from(TABLE).delete().eq('id', id);
    setBusyId(null);
    if (deleteError) { setError(deleteError.message); return; }
    setPending((prev) => prev.filter((e) => e.id !== id));
    setPublished((prev) => prev.filter((e) => e.id !== id));
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

        {supabase && (
          <>
            <p className="section-label" style={{ marginBottom: '0.75rem' }}>
              Awaiting review {status === 'ready' ? `(${pending.length})` : ''}
            </p>
            {status === 'ready' && pending.length === 0 && (
              <p className="mono" style={{ opacity: 0.5, marginBottom: '1.5rem' }}>No entries waiting for review.</p>
            )}
            {pending.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                actions={
                  <>
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
                      onClick={() => remove(entry.id)}
                    >
                      Reject
                    </button>
                  </>
                }
              />
            ))}

            <p className="section-label" style={{ margin: '1.75rem 0 0.75rem' }}>
              Published {status === 'ready' ? `(${published.length})` : ''}
            </p>
            {status === 'ready' && published.length === 0 && (
              <p className="mono" style={{ opacity: 0.5 }}>Nothing published yet.</p>
            )}
            {published.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                actions={
                  <button
                    type="button"
                    className="admin-reset-btn mono"
                    disabled={busyId === entry.id}
                    onClick={() => remove(entry.id, { confirmFirst: true, label: `sign by "${entry.display_name}"` })}
                  >
                    {busyId === entry.id ? 'Removing…' : 'Remove'}
                  </button>
                }
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
