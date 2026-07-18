import React, { useState } from 'react';
import { getSupabaseClient } from '../../utils/supabaseClient';

// Fetches the owner's actual ElevenLabs voices (not the shared Voice
// Library, which the free API tier can't call directly) via the
// elevenlabs-generate function's GET route, so picking a working voice ID
// is a dropdown instead of trial-and-error copy-pasting.
export default function VoicePicker({ value, onChange }) {
  const [voices, setVoices] = useState(null); // null = not fetched yet
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [error, setError] = useState('');

  const fetchVoices = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) { setError('Supabase is not configured.'); setStatus('error'); return; }

    setStatus('loading');
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign in to the editor first.');

      const base = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${base}/functions/v1/elevenlabs-generate`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Could not list voices (HTTP ${res.status})`);

      setVoices(json.voices || []);
      setStatus('idle');
    } catch (e) {
      setError(e.message || 'Could not list voices.');
      setStatus('error');
    }
  };

  return (
    <div className="form-group">
      <label className="form-label mono">ElevenLabs Voice ID</label>
      <div className="tech-input-row">
        <input
          className="admin-input"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="e.g. EXAVITQu4vr4xnSDxMaL"
        />
        <button type="button" className="tech-add-btn mono" onClick={fetchVoices} disabled={status === 'loading'}>
          {status === 'loading' ? 'Loading…' : 'Fetch my voices'}
        </button>
      </div>

      {error && <p className="admin-error mono">{error}</p>}

      {voices && (
        voices.length === 0 ? (
          <p className="mono" style={{ fontSize: '0.65rem', color: 'var(--dust)', marginTop: '0.5rem' }}>
            No voices found on this account yet — add one at elevenlabs.io → Voices → Voice Library → Add.
          </p>
        ) : (
          <select
            className="admin-input"
            style={{ marginTop: '0.5rem' }}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          >
            <option value="" disabled>Pick a voice from your account…</option>
            {voices.map(v => (
              <option key={v.voiceId} value={v.voiceId}>
                {v.name} {v.category ? `(${v.category})` : ''}
              </option>
            ))}
          </select>
        )
      )}
    </div>
  );
}
