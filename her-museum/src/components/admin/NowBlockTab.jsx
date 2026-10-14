import React, { useState, useEffect } from 'react';

const EMPTY = { title: '', description: '', updatedAt: '' };

function formatUpdatedAt(isoString) {
  if (!isoString) return 'Never published';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Never published';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * Self-contained "Now Building" editor. Purely controlled: reads `value`
 * ({ title, description, updatedAt }) and reports the whole replacement
 * object to `onSave`. Mirrors AdminPanel's SettingsForm conventions.
 */
export default function NowBlockTab({ value, onSave }) {
  const [form, setForm] = useState(value || EMPTY);
  const [saved, setSaved] = useState(false);

  // Sync when the value prop changes (e.g. switching views, external reset)
  useEffect(() => { setForm(value || EMPTY); }, [value]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = (e) => {
    e.preventDefault();
    onSave({ ...form, updatedAt: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clear = () => {
    const cleared = { title: '', description: '', updatedAt: '' };
    setForm(cleared);
    onSave(cleared);
  };

  return (
    <form className="project-form" onSubmit={handleSave}>
      <div className="form-tabs">
        <button type="button" className="form-tab mono active">Now Building</button>
      </div>

      <div className="form-section" style={{ marginTop: '2rem' }}>
        <div className="form-group">
          <label className="form-label mono" htmlFor="nb-title">
            Title <span className="form-hint">— shown as the public headline</span>
          </label>
          <input
            id="nb-title"
            className="admin-input"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. A generative music toy"
          />
        </div>

        <div className="form-group">
          <label className="form-label mono" htmlFor="nb-desc">
            Description <span className="form-hint">— one short line</span>
          </label>
          <textarea
            id="nb-desc"
            className="admin-input admin-textarea"
            rows={3}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="A quick note on what you're currently building..."
          />
          <span className="form-char-count mono">{form.description.length} chars</span>
        </div>

        <p className="mono" style={{ fontSize: '0.65rem', color: 'var(--dust)' }}>
          Last updated: {formatUpdatedAt(value?.updatedAt)}
          <br />
          Saving stamps the update time automatically — leave the title empty to hide this block from visitors.
        </p>
      </div>

      <div className="form-actions">
        <button type="button" className="form-btn-cancel mono" onClick={clear}>
          Clear
        </button>
        <button type="submit" className={`form-btn-save mono ${saved ? 'saved' : ''}`}>
          {saved ? '✓ Saved' : 'Save Now Building →'}
        </button>
      </div>
    </form>
  );
}
