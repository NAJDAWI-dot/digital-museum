import React, { useState } from 'react';
import { getSupabaseClient } from '../../utils/supabaseClient';
import './NarrationGenerator.css';

const BUCKET = 'project-media';
const FREE_TIER_CHARS = 10000;

// Generates narration from text via the elevenlabs-generate Supabase Edge
// Function, then uploads the resulting audio to Storage and saves the
// word-level timing data alongside it. Generation is a deliberate one-time
// action per script (not regenerated per visitor) — the free ElevenLabs
// tier is a shared monthly budget, so this is priced in.

function base64ToBlob(base64, mime) {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** ElevenLabs gives per-character timing; the transcript highlights whole
 * words, so group characters into words on whitespace boundaries. Each
 * word's window is [first char's start, last char's end]. */
function charsToWords(characters, charStart, charEnd) {
  const words = [];
  let current = '';
  let start = null;
  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    if (/\s/.test(ch)) {
      if (current) { words.push({ word: current, start, end: charEnd[i - 1] }); current = ''; start = null; }
      continue;
    }
    if (start === null) start = charStart[i];
    current += ch;
  }
  if (current) words.push({ word: current, start, end: charEnd[characters.length - 1] });
  return words;
}

export default function NarrationGenerator({ projectId, script, onScriptChange, onGenerated }) {
  const [status, setStatus] = useState('idle'); // idle | generating | error
  const [error, setError] = useState('');

  const charsUsed = script?.length || 0;
  const overBudget = charsUsed > FREE_TIER_CHARS;

  const generate = async () => {
    const text = (script || '').trim();
    if (!text) { setError('Write a narration script first.'); return; }

    const supabase = getSupabaseClient();
    if (!supabase) { setError('Supabase is not configured.'); return; }

    setStatus('generating');
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign in to the editor first.');

      const base = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${base}/functions/v1/elevenlabs-generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Generation failed (HTTP ${res.status})`);

      const words = charsToWords(json.characters, json.charStart, json.charEnd);
      const blob = base64ToBlob(json.audioBase64, 'audio/mpeg');

      const path = `audio-guide/${projectId || 'draft'}-${Date.now()}.mp3`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, {
        upsert: true,
        contentType: 'audio/mpeg',
      });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onGenerated({ audio: urlData.publicUrl, audioTimestamps: words });
      setStatus('idle');
    } catch (e) {
      setError(e.message || 'Generation failed.');
      setStatus('idle');
    }
  };

  return (
    <div className="narration-gen">
      <div className="narration-gen-label mono">
        Narration Script <span className="form-hint">— spoken aloud by the audio guide, generated via ElevenLabs</span>
      </div>
      <textarea
        className="admin-input admin-textarea"
        rows={5}
        value={script || ''}
        onChange={(e) => onScriptChange(e.target.value)}
        placeholder="Write narration-friendly prose here — short sentences, no headings or lists…"
      />
      <div className={`narration-gen-count mono ${overBudget ? 'over' : ''}`}>
        {charsUsed.toLocaleString()} / {FREE_TIER_CHARS.toLocaleString()} chars (free tier is monthly, shared across all narrations)
      </div>

      {error && <p className="admin-error mono">{error}</p>}

      <button
        type="button"
        className="form-btn-save mono"
        onClick={generate}
        disabled={status === 'generating' || !script?.trim()}
      >
        {status === 'generating' ? 'Generating…' : '🎙️ Generate Narration'}
      </button>
    </div>
  );
}
