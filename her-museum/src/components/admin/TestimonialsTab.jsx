import React, { useState } from 'react';
import '../AdminPanel.css';
import './TestimonialsTab.css';

const EMPTY_ITEM = () => ({ id: `ts${Date.now()}`, name: '', role: '', quote: '', avatarUrl: '' });

export default function TestimonialsTab({ testimonials, onSave }) {
  const [items, setItems] = useState([...(testimonials || [])]);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    onSave(items);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateItem = (index, key, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: value };
    setItems(newItems);
  };

  const addItem = () => setItems([EMPTY_ITEM(), ...items]);

  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  return (
    <form className="project-form" onSubmit={handleSave}>
      <div className="form-tabs">
        <button type="button" className="form-tab mono active">Testimonials</button>
        <button
          type="button"
          className="form-tab mono"
          onClick={addItem}
          style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)' }}
        >
          + Add Testimonial
        </button>
      </div>

      <div className="form-section testimonials-tab-list">
        {items.map((item, i) => (
          <div key={item.id} className="testimonial-tab-item">
            <button
              type="button"
              className="testimonial-tab-remove"
              onClick={() => removeItem(i)}
              aria-label="Remove testimonial"
            >×</button>

            <div className="testimonial-tab-preview">
              {item.avatarUrl ? (
                <img src={item.avatarUrl} alt="" className="testimonial-tab-avatar" />
              ) : (
                <span className="testimonial-tab-avatar testimonial-tab-avatar-fallback mono">
                  {(item.name || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label mono">Name</label>
                <input className="admin-input" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="form-group">
                <label className="form-label mono">Role / Company</label>
                <input className="admin-input" value={item.role} onChange={e => updateItem(i, 'role', e.target.value)} placeholder="Product Lead, Acme Co." />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label mono">Avatar URL</label>
              <input className="admin-input" value={item.avatarUrl} onChange={e => updateItem(i, 'avatarUrl', e.target.value)} placeholder="https://..." />
            </div>

            <div className="form-group">
              <label className="form-label mono">Quote</label>
              <textarea className="admin-input admin-textarea" rows={3} value={item.quote} onChange={e => updateItem(i, 'quote', e.target.value)} placeholder="What they said..." />
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="mono" style={{ opacity: 0.5 }}>No testimonials added yet.</p>}
      </div>

      <div className="form-actions">
        <button type="submit" className={`form-btn-save mono ${saved ? 'saved' : ''}`}>
          {saved ? '✓ Saved' : 'Save Testimonials →'}
        </button>
      </div>
    </form>
  );
}
