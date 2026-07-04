import React from 'react';
import './CollaboratorsField.css';

/**
 * Reusable, self-contained editor for a project's `collaborators` array.
 * Purely controlled: pass the current array as `value` and a `onChange`
 * callback that receives the whole replacement array on every edit.
 *
 * Entry shape: { name: string, role: string, url: string }
 */
export default function CollaboratorsField({ value, onChange }) {
  const rows = value || [];

  const addRow = () => {
    onChange([...rows, { name: '', role: '', url: '' }]);
  };

  const updateRow = (index, key, val) => {
    const next = rows.slice();
    next[index] = { ...next[index], [key]: val };
    onChange(next);
  };

  const removeRow = (index) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="form-group collab-field">
      <label className="form-label mono">Collaborators <span className="form-hint">— credited contributors on this project</span></label>

      <div className="collab-rows">
        {rows.map((c, i) => (
          <div key={i} className="collab-row">
            <button type="button" className="collab-row-remove" onClick={() => removeRow(i)} aria-label="Remove collaborator">×</button>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label mono">Name</label>
                <input
                  className="admin-input"
                  value={c.name || ''}
                  onChange={e => updateRow(i, 'name', e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="form-group">
                <label className="form-label mono">Role</label>
                <input
                  className="admin-input"
                  value={c.role || ''}
                  onChange={e => updateRow(i, 'role', e.target.value)}
                  placeholder="Designer"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label mono">Link <span className="form-hint">— optional</span></label>
              <input
                className="admin-input"
                value={c.url || ''}
                onChange={e => updateRow(i, 'url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="mono collab-empty">No collaborators added yet.</p>}
      </div>

      <button type="button" className="tech-add-btn mono collab-add-btn" onClick={addRow}>+ Add Collaborator</button>
    </div>
  );
}
