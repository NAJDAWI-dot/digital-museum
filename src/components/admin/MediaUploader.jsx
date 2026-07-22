import React, { useRef, useState } from 'react';
import { getSupabaseClient } from '../../utils/supabaseClient';
import './MediaUploader.css';

const BUCKET = 'project-media';

/** Pulls the object path back out of a project-media public URL, so Remove
 * can delete the actual storage object instead of only clearing the field. */
function pathFromPublicUrl(url) {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

/**
 * MediaUploader — uploads a 3D model or audio file straight to Supabase
 * Storage (bucket "project-media") and stores the resulting public URL on
 * the project. Requires the owner's authenticated editor session (same one
 * AdminPanel's login establishes) — the storage bucket's RLS policies
 * reject uploads from anyone else.
 *
 * Props:
 *  value      – current URL (or legacy repo-relative path)
 *  onChange   – (url) => void
 *  label      – field label
 *  folder     – storage sub-folder, e.g. "models" or "audio-guide"
 *  accept     – input[accept] string, e.g. ".glb"
 *  extensions – allowed extensions (lowercase, with dot) for validation
 *  maxSizeMB  – max upload size
 *  hint       – short helper line under the label
 */
export default function MediaUploader({
  value, onChange, label, folder, accept, extensions, maxSizeMB = 50, hint,
}) {
  const inputRef = useRef(null);
  const uploadingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | uploading | error
  const [error, setError] = useState('');

  const upload = async (file) => {
    // Guards against re-entry from any call site (click, drag-drop, or the
    // hidden file input) — a ref (not state) so the check is synchronous
    // and can't be raced by a second drop landing before React re-renders.
    if (uploadingRef.current) return;
    if (!file) return;

    setError('');

    const ext = `.${file.name.split('.').pop().toLowerCase()}`;
    if (extensions && !extensions.includes(ext)) {
      setError(`File must be ${extensions.join(' or ')}.`);
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Max size is ${maxSizeMB}MB.`);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) { setError('Supabase is not configured.'); return; }

    uploadingRef.current = true;
    setStatus('uploading');
    try {
      const path = `${folder}/${Date.now()}${ext}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

      // Best-effort: replacing a file removes the old one so the bucket
      // doesn't accumulate orphans. Never blocks the new upload from landing.
      // Safe to read `value` here (not stale) since the re-entry guard above
      // means only one upload() can be in flight at a time.
      if (value?.includes('/storage/v1/object/public/')) {
        const oldPath = pathFromPublicUrl(value);
        if (oldPath) supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
      }

      onChange(data.publicUrl);
    } catch (e) {
      setError(e.message || 'Upload failed.');
    } finally {
      uploadingRef.current = false;
      setStatus('idle');
    }
  };

  const remove = async () => {
    const oldPath = value ? pathFromPublicUrl(value) : null;
    onChange('');
    if (oldPath) {
      const supabase = getSupabaseClient();
      supabase?.storage.from(BUCKET).remove([oldPath]).catch(() => {});
    }
  };

  const fileName = value ? decodeURIComponent(value.split('/').pop()) : '';

  return (
    <div className="media-uploader">
      <div className="media-uploader-label mono">
        {label}
        {hint && <span className="media-uploader-hint"> — {hint}</span>}
      </div>

      <div
        className={`media-drop-zone ${dragging ? 'dragging' : ''} ${value ? 'has-file' : ''}`}
        onClick={() => status !== 'uploading' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files[0]); }}
      >
        {status === 'uploading' ? (
          <div className="media-placeholder">
            <span className="media-spinner" aria-hidden="true" />
            <p className="mono">Uploading…</p>
          </div>
        ) : value ? (
          <div className="media-file-row">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="media-file-name mono">{fileName}</span>
          </div>
        ) : (
          <div className="media-placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p className="mono">Click, or drag & drop</p>
          </div>
        )}
      </div>

      {error && <p className="media-error mono">{error}</p>}

      {value && status !== 'uploading' && (
        <button type="button" className="media-remove mono" onClick={(e) => { e.stopPropagation(); remove(); }}>
          × Remove
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => upload(e.target.files[0])}
      />
    </div>
  );
}
