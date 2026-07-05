import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMuseum } from '../context/MuseumContext';
import ImageUploader, { MultiImageUploader } from './ImageUploader';
import { resolveAsset } from '../lib/assets';
import CollaboratorsField from './admin/CollaboratorsField';
import TestimonialsTab from './admin/TestimonialsTab';
import NowBlockTab from './admin/NowBlockTab';
import AnalyticsTab from './admin/AnalyticsTab';
import './AdminPanel.css';

const EMPTY = {
  title: '', subtitle: '', category: 'Engineering',
  year: new Date().getFullYear().toString(),
  description: '', longDescription: '',
  tech: [], color: '#1a1a2e', accentColor: '#c9a96e',
  link: '#', repo: '#', featured: false, status: 'Live',
  coverImage: '', screenshots: [], collaborators: [],
};

const CATEGORIES = ['Engineering', 'Web Application', 'Website', 'Application'];
const STATUSES   = ['Live', 'Beta', 'Deployed', 'Open Source', 'Archived'];
const TABS       = ['Info', 'Description', 'Media', 'Links & Style', 'Collaborators'];

/* ── Login ───────────────────────────────── */
function LoginForm({ onLogin }) {
  const [pass, setPass]   = useState('');
  const [error, setError] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!onLogin(pass)) {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login-inner">
        <p className="section-label" style={{ marginBottom: '2rem' }}>Editor Access</p>
        <h2 className="admin-login-title serif">Enter your<br /><em>password</em></h2>
        <form onSubmit={submit} className="admin-login-form">
          <input
            id="admin-password"
            type="password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            placeholder="Password"
            className={`admin-input ${error ? 'error' : ''}`}
            autoFocus
          />
          {error && <p className="admin-error mono">Incorrect password</p>}
          <button type="submit" className="admin-submit-btn mono">Unlock →</button>
        </form>
      </div>
    </div>
  );
}

/* ── Project List Sidebar ─────────────────── */
function ProjectList({ projects, onSelect, onDelete, onNew, onMove, selectedId }) {
  const dragIdx = React.useRef(null);
  const [overIdx, setOverIdx] = React.useState(null);

  const handleDragStart = (e, i) => {
    dragIdx.current = i;
    e.dataTransfer.effectAllowed = 'move';
    // Make the ghost slightly transparent
    setTimeout(() => e.target.classList.add('dragging'), 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setOverIdx(null);
    dragIdx.current = null;
  };

  const handleDragOver = (e, i) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(i);
  };

  const handleDrop = (e, i) => {
    e.preventDefault();
    if (dragIdx.current !== null && dragIdx.current !== i) {
      onMove(dragIdx.current, i);
    }
    setOverIdx(null);
  };

  return (
    <div className="proj-list">
      <div className="proj-list-header">
        <span className="section-label" style={{ fontSize: '0.55rem' }}>Projects ({projects.length})</span>
        <button className="proj-new-btn mono" onClick={onNew}>+ New</button>
      </div>

      {projects.length > 1 && (
        <div className="proj-list-reorder-hint mono">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          Drag to reorder
        </div>
      )}

      <div className="proj-list-items">
        {projects.map((p, i) => (
          <div
            key={p.id}
            className={`proj-list-item ${selectedId === p.id ? 'active' : ''} ${overIdx === i ? 'drop-target' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragLeave={() => setOverIdx(null)}
            onDrop={(e) => handleDrop(e, i)}
            onClick={() => onSelect(p)}
          >
            {/* Drag handle */}
            <div className="proj-drag-handle" title="Drag to reorder">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9"  cy="5"  r="1" fill="currentColor"/>
                <circle cx="9"  cy="12" r="1" fill="currentColor"/>
                <circle cx="9"  cy="19" r="1" fill="currentColor"/>
                <circle cx="15" cy="5"  r="1" fill="currentColor"/>
                <circle cx="15" cy="12" r="1" fill="currentColor"/>
                <circle cx="15" cy="19" r="1" fill="currentColor"/>
              </svg>
            </div>

            <div
              className="proj-list-swatch"
              style={{ background: p.coverImage ? `url(${resolveAsset(p.coverImage)}) center/cover` : p.color }}
            ></div>

            <div className="proj-list-info">
              <span className="proj-list-title">{p.title || 'Untitled'}</span>
              <span className="mono proj-list-cat">{p.category} · {p.year}</span>
            </div>

            <div className="proj-list-num mono">#{i + 1}</div>

            <button
              className="proj-list-delete"
              onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${p.title}"?`)) onDelete(p.id); }}
              title="Delete"
            >×</button>
          </div>
        ))}
        {projects.length === 0 && (
          <p className="proj-list-empty mono">No projects yet.<br/>Click "+ New" to add one.</p>
        )}
      </div>
    </div>
  );
}

/* ── Tabbed Form ─────────────────────────── */
function ProjectForm({ project, onSave, onCancel }) {
  const [form, setForm]       = useState(project || EMPTY);
  const [tab, setTab]         = useState(0);
  const [techInput, setTech]  = useState('');
  const [saved, setSaved]     = useState(false);

  // Sync when project prop changes (switching between projects)
  useEffect(() => { setForm(project || EMPTY); setTab(0); }, [project]);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const addTech = (e) => {
    e?.preventDefault();
    if (!techInput.trim()) return;
    set('tech', [...form.tech, techInput.trim()]);
    setTech('');
  };

  const removeTech = (i) => set('tech', form.tech.filter((_, idx) => idx !== i));

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setTab(0); return; }
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form className="project-form" onSubmit={handleSave}>
      {/* Tab nav */}
      <div className="form-tabs">
        {TABS.map((t, i) => (
          <button key={t} type="button" className={`form-tab mono ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* Live preview mini card */}
      <div className="form-preview">
        <div className="fp-swatch" style={{ background: form.coverImage ? `url(${resolveAsset(form.coverImage)}) center/cover` : form.color }}>
          {!form.coverImage && <div className="fp-glow" style={{ background: form.accentColor }}></div>}
          <span className="mono fp-cat">{form.category}</span>
          <span className="mono fp-year">{form.year}</span>
        </div>
        <div className="fp-body">
          <p className="fp-title serif">{form.title || 'Project Title'}</p>
          <p className="fp-sub">{form.subtitle || 'Subtitle'}</p>
          <div className="fp-tech">
            {form.tech.slice(0, 3).map((t, i) => <span key={i} className="fp-tag mono">{t}</span>)}
          </div>
        </div>
      </div>

      {/* ── Tab 0: Info ── */}
      <AnimatePresence mode="wait">
        {tab === 0 && (
          <motion.div key="info" className="form-section" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label mono" htmlFor="f-title">Title *</label>
                <input id="f-title" className="admin-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Project Name" required />
              </div>
              <div className="form-group">
                <label className="form-label mono" htmlFor="f-sub">Subtitle</label>
                <input id="f-sub" className="admin-input" value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="One-line descriptor" />
              </div>
            </div>

            <div className="form-row form-row--3">
              <div className="form-group">
                <label className="form-label mono" htmlFor="f-cat">Category</label>
                <select id="f-cat" className="admin-input" value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label mono" htmlFor="f-status">Status</label>
                <select id="f-status" className="admin-input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label mono" htmlFor="f-year">Year</label>
                <input id="f-year" className="admin-input" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2025" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label mono">Tech Stack</label>
              <div className="tech-input-row">
                <input className="admin-input" value={techInput} onChange={e => setTech(e.target.value)} placeholder="e.g. React" onKeyDown={e => e.key === 'Enter' && addTech(e)} />
                <button type="button" className="tech-add-btn mono" onClick={addTech}>Add</button>
              </div>
              <div className="tech-tags-edit">
                {form.tech.map((t, i) => (
                  <span key={i} className="tech-tag-edit mono">{t}<button type="button" onClick={() => removeTech(i)}>×</button></span>
                ))}
              </div>
            </div>

            <label className="form-check">
              <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} />
              <span className="mono">Mark as Featured (shown in banner)</span>
            </label>
          </motion.div>
        )}

        {/* ── Tab 1: Description ── */}
        {tab === 1 && (
          <motion.div key="desc" className="form-section" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <div className="form-group">
              <label className="form-label mono" htmlFor="f-desc">Card Description <span className="form-hint">— shown on gallery card</span></label>
              <textarea id="f-desc" className="admin-input admin-textarea" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="One paragraph summary for the card..." />
              <span className="form-char-count mono">{form.description.length} chars</span>
            </div>
            <div className="form-group">
              <label className="form-label mono" htmlFor="f-long">Full Write-up <span className="form-hint">— shown in the project detail modal</span></label>
              <textarea id="f-long" className="admin-input admin-textarea" rows={8} value={form.longDescription} onChange={e => set('longDescription', e.target.value)} placeholder="Detailed technical write-up, outcomes, metrics..." />
              <span className="form-char-count mono">{form.longDescription.length} chars</span>
            </div>
          </motion.div>
        )}

        {/* ── Tab 2: Media ── */}
        {tab === 2 && (
          <motion.div key="media" className="form-section" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <ImageUploader
              label="Cover Image"
              value={form.coverImage}
              onChange={v => set('coverImage', v)}
              aspectHint="16:9"
            />
            <MultiImageUploader
              values={form.screenshots || []}
              onChange={v => set('screenshots', v)}
              maxImages={6}
            />
          </motion.div>
        )}

        {/* ── Tab 3: Links & Style ── */}
        {tab === 3 && (
          <motion.div key="links" className="form-section" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label mono" htmlFor="f-link">Live URL</label>
                <input id="f-link" className="admin-input" value={form.link} onChange={e => set('link', e.target.value)} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="form-label mono" htmlFor="f-repo">Repository</label>
                <input id="f-repo" className="admin-input" value={form.repo} onChange={e => set('repo', e.target.value)} placeholder="https://github.com/..." />
              </div>
            </div>

            <div className="color-row-pair">
              <div className="form-group">
                <label className="form-label mono">Card Background</label>
                <div className="color-pick-row">
                  <input id="f-color" type="color" className="color-picker" value={form.color} onChange={e => set('color', e.target.value)} />
                  <input className="admin-input" value={form.color} onChange={e => set('color', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label mono">Glow Accent</label>
                <div className="color-pick-row">
                  <input id="f-accent" type="color" className="color-picker" value={form.accentColor} onChange={e => set('accentColor', e.target.value)} />
                  <input className="admin-input" value={form.accentColor} onChange={e => set('accentColor', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="color-preview" style={{ background: form.color }}>
              <div className="color-preview-glow" style={{ background: form.accentColor }}></div>
              <span className="mono color-preview-label">Card Preview</span>
            </div>
          </motion.div>
        )}

        {/* ── Tab 4: Collaborators ── */}
        {tab === 4 && (
          <motion.div key="collab" className="form-section" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <CollaboratorsField value={form.collaborators} onChange={v => set('collaborators', v)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="form-actions">
        <button type="button" className="form-btn-cancel mono" onClick={onCancel}>Cancel</button>
        <button type="submit" className={`form-btn-save mono ${saved ? 'saved' : ''}`}>
          {saved ? '✓ Saved' : (project ? 'Save Changes →' : 'Add Project →')}
        </button>
      </div>
    </form>
  );
}

/* ── Settings Form ────────────────────────── */
function SettingsForm({ settings, onSave }) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const set = (k, v) => setForm({ ...form, [k]: v });
  const setSocial = (k, v) => setForm({ ...form, social: { ...form.social, [k]: v } });

  return (
    <form className="project-form" onSubmit={handleSave}>
      <div className="form-tabs">
        <button type="button" className="form-tab mono active">Global Settings</button>
      </div>

      <div className="form-section" style={{ marginTop: '2rem' }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label mono">Contact Email</label>
            <input className="admin-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label mono">CV Link (PDF URL)</label>
            <input className="admin-input" value={form.cvLink} onChange={e => set('cvLink', e.target.value)} placeholder="https://..." />
          </div>
        </div>
        
        <p className="section-label" style={{ marginTop: '2rem', marginBottom: '1rem' }}>Social Links</p>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label mono">GitHub URL</label>
            <input className="admin-input" value={form.social?.github || ''} onChange={e => setSocial('github', e.target.value)} placeholder="https://github.com/..." />
          </div>
          <div className="form-group">
            <label className="form-label mono">LinkedIn URL</label>
            <input className="admin-input" value={form.social?.linkedin || ''} onChange={e => setSocial('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
        </div>

        <p className="section-label" style={{ marginTop: '2rem', marginBottom: '1rem' }}>Analytics</p>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label mono">GoatCounter Site Code</label>
            <input className="admin-input" value={form.goatcounterSiteCode || ''} onChange={e => set('goatcounterSiteCode', e.target.value)} placeholder="e.g. my-site" />
          </div>
        </div>

        <p className="section-label" style={{ marginTop: '2rem', marginBottom: '1rem' }}>Guestbook (Supabase)</p>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label mono">Supabase Project URL</label>
            <input className="admin-input" value={form.supabaseUrl || ''} onChange={e => set('supabaseUrl', e.target.value)} placeholder="https://xxxx.supabase.co" />
          </div>
          <div className="form-group">
            <label className="form-label mono">Supabase Anon Key</label>
            <input className="admin-input" value={form.supabaseAnonKey || ''} onChange={e => set('supabaseAnonKey', e.target.value)} placeholder="public anon key" />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className={`form-btn-save mono ${saved ? 'saved' : ''}`}>
          {saved ? '✓ Saved' : 'Save Settings →'}
        </button>
      </div>
    </form>
  );
}

/* ── Timeline Form ────────────────────────── */
function TimelineForm({ timeline, onSave }) {
  const [items, setItems] = useState([...timeline]);
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

  const addItem = () => {
    setItems([{ id: `t${Date.now()}`, year: 'Year', title: 'Role', organization: 'Company', description: 'Description...' }, ...items]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <form className="project-form" onSubmit={handleSave}>
      <div className="form-tabs">
        <button type="button" className="form-tab mono active">Career Journey</button>
        <button type="button" className="form-tab mono" onClick={addItem} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)' }}>+ Add Milestone</button>
      </div>

      <div className="form-section" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {items.map((item, i) => (
          <div key={item.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', position: 'relative' }}>
            <button type="button" onClick={() => removeItem(i)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            <div className="form-row">
              <div className="form-group" style={{ flex: '0 0 100px' }}>
                <label className="form-label mono">Year</label>
                <input className="admin-input" value={item.year} onChange={e => updateItem(i, 'year', e.target.value)} placeholder="2024" />
              </div>
              <div className="form-group">
                <label className="form-label mono">Title / Role</label>
                <input className="admin-input" value={item.title} onChange={e => updateItem(i, 'title', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label mono">Organization</label>
                <input className="admin-input" value={item.organization} onChange={e => updateItem(i, 'organization', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label mono">Description</label>
              <textarea className="admin-input admin-textarea" rows={2} value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="mono" style={{ opacity: 0.5 }}>No milestones added yet.</p>}
      </div>

      <div className="form-actions">
        <button type="submit" className={`form-btn-save mono ${saved ? 'saved' : ''}`}>
          {saved ? '✓ Saved' : 'Save Timeline →'}
        </button>
      </div>
    </form>
  );
}

/* ── Main Panel ──────────────────────────── */
export default function AdminPanel() {
  const {
    isAdmin, login, adminPanel, setAdminPanel,
    editingProject, setEditingProject,
    addProject, updateProject, deleteProject, moveProject,
    projects, resetToDefaults,
    settings, updateSettings,
    timeline, updateTimeline,
    testimonials, updateTestimonials,
    githubToken, setGithubToken,
    goatcounterApiToken, setGoatcounterApiToken
  } = useMuseum();

  const [localEditing, setLocalEditing] = useState(null);
  const [activeView, setActiveView] = useState('projects'); // 'projects', 'settings', 'timeline', 'testimonials', 'nowblock', 'analytics'

  useEffect(() => { setLocalEditing(editingProject); setActiveView('projects'); }, [editingProject]);
  useEffect(() => {
    if (adminPanel) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [adminPanel]);

  const handleSelect   = (p) => { setActiveView('projects'); setLocalEditing(p); };
  const handleNew      = () => { setActiveView('projects'); setLocalEditing(null); };
  const handleDelete   = (id) => { deleteProject(id); if (localEditing?.id === id) setLocalEditing(null); };

  const handleSave = (form) => {
    if (localEditing) {
      updateProject(localEditing.id, form);
      setLocalEditing({ ...localEditing, ...form });
    } else {
      const np = addProject(form);
      setLocalEditing(np);
    }
  };

  const handleClose = () => { setAdminPanel(false); setEditingProject(null); setLocalEditing(null); };

  return (
    <AnimatePresence>
      {adminPanel && (
        <>
          <motion.div className="admin-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} />
          <motion.aside
            className="admin-panel"
            role="dialog"
            aria-modal="true"
            aria-label={!isAdmin ? 'Editor access' : 'Museum editor'}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="admin-top-bar">
              <span className="mono admin-panel-label">
                {!isAdmin ? 'Editor Access' : 'Museum Editor'}
              </span>
              <div className="admin-top-actions">
                {isAdmin && (
                  <>
                    <button className={`admin-reset-btn mono ${activeView === 'timeline' ? 'active' : ''}`} onClick={() => setActiveView('timeline')}>
                      ⏳ Timeline
                    </button>
                    <button className={`admin-reset-btn mono ${activeView === 'testimonials' ? 'active' : ''}`} onClick={() => setActiveView('testimonials')}>
                      💬 Testimonials
                    </button>
                    <button className={`admin-reset-btn mono ${activeView === 'nowblock' ? 'active' : ''}`} onClick={() => setActiveView('nowblock')}>
                      🔨 Now Building
                    </button>
                    <button className={`admin-reset-btn mono ${activeView === 'analytics' ? 'active' : ''}`} onClick={() => setActiveView('analytics')}>
                      📈 Analytics
                    </button>
                    <button className={`admin-reset-btn mono ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')}>
                      ⚙ Settings
                    </button>
                    <input 
                      type="password" 
                      placeholder="GitHub PAT (for auto-sync)" 
                      className="admin-input mono" 
                      style={{ width: '220px', height: '28px', fontSize: '0.65rem', margin: 0, padding: '0 0.5rem', background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.1)' }}
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      title="Paste your GitHub Personal Access Token here to automatically commit edits to the live site."
                    />
                    <button
                      className="admin-export-btn mono"
                      title="Download projects as projects.js — paste into src/data/ before deploying"
                      onClick={() => {
                        const content = `// Auto-generated by Museum Editor\nexport const INITIAL_PROJECTS = ${JSON.stringify(projects, null, 2)};\n\nexport const SITE_SETTINGS = ${JSON.stringify(settings, null, 2)};\n\nexport const INITIAL_TIMELINE = ${JSON.stringify(timeline, null, 2)};\n\nexport const INITIAL_TESTIMONIALS = ${JSON.stringify(testimonials, null, 2)};\n`;
                        const blob = new Blob([content], { type: 'text/javascript' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'projects.js'; a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Export
                    </button>
                    <button className="admin-reset-btn mono" onClick={resetToDefaults} title="Reset to defaults">
                      Reset
                    </button>
                  </>
                )}
                <button className="admin-close-btn" onClick={handleClose} aria-label="Close">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {!isAdmin ? (
              <div className="admin-content"><LoginForm onLogin={login} /></div>
            ) : (
              <div className="admin-body">
                <ProjectList
                  projects={projects}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                  onNew={handleNew}
                  onMove={moveProject}
                  selectedId={activeView === 'projects' ? localEditing?.id : null}
                />
                <div className="admin-form-area">
                  <div className="admin-content">
                    {activeView === 'settings' ? (
                      <SettingsForm settings={settings} onSave={updateSettings} />
                    ) : activeView === 'timeline' ? (
                      <TimelineForm timeline={timeline} onSave={updateTimeline} />
                    ) : activeView === 'testimonials' ? (
                      <TestimonialsTab testimonials={testimonials} onSave={updateTestimonials} />
                    ) : activeView === 'nowblock' ? (
                      <NowBlockTab value={settings.nowBuilding} onSave={(nb) => updateSettings({ ...settings, nowBuilding: nb })} />
                    ) : activeView === 'analytics' ? (
                      <AnalyticsTab
                        goatcounterSiteCode={settings.goatcounterSiteCode}
                        goatcounterApiToken={goatcounterApiToken}
                        setGoatcounterApiToken={setGoatcounterApiToken}
                      />
                    ) : (
                      <ProjectForm
                        project={localEditing}
                        onSave={handleSave}
                        onCancel={handleClose}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
