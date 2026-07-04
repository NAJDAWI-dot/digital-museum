import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { INITIAL_PROJECTS, SITE_SETTINGS, INITIAL_TIMELINE, INITIAL_TESTIMONIALS } from '../data/projects';

const MuseumContext = createContext(null);

const STORAGE_KEY    = 'arch_museum_projects_v2';
const ADMIN_KEY      = 'arch_admin_session';
export const ADMIN_PASS = 'arch2026'; // ← change this

// A cheap, stable signature of the data bundled into this build. Stored with
// each draft so a draft can tell whether the deployed data has changed since
// it was saved.
function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const DEPLOY_SIG = hashString(
  JSON.stringify({ p: INITIAL_PROJECTS, t: INITIAL_TIMELINE, s: SITE_SETTINGS })
);

// Hydrate editor drafts saved in this browser; fall back to the deployed data.
// A draft is only honoured while it matches the bundle it was based on — once a
// new deploy changes the bundled data, the un-pushed draft is stale and the
// freshly published content wins.
function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!Array.isArray(draft.projects)) return null;
    if (draft.baseSig !== DEPLOY_SIG) return null;
    return draft;
  } catch {
    return null;
  }
}

export function MuseumProvider({ children }) {
  // Read localStorage exactly once for the life of the provider; useState only
  // consumes the initial value, so re-reading on every render is wasted work.
  const draftRef = useRef(undefined);
  if (draftRef.current === undefined) draftRef.current = loadDraft();
  const draft = draftRef.current;

  const [projects, setProjects] = useState(draft?.projects || INITIAL_PROJECTS);
  const [timeline, setTimeline] = useState(draft?.timeline || INITIAL_TIMELINE || []);
  const [testimonials, setTestimonials] = useState(draft?.testimonials || INITIAL_TESTIMONIALS || []);
  const [settings, setSettings] = useState(draft?.settings || SITE_SETTINGS || {
    email: 'najdawihashem01@gmail.com',
    cvLink: '#',
    social: { github: '#', linkedin: '#' }
  });

  const safeGetAdmin = () => {
    try { return localStorage.getItem(ADMIN_KEY) === 'true'; }
    catch { return false; }
  };

  const [isAdmin,       setIsAdmin]       = useState(safeGetAdmin);
  const [adminPanel,    setAdminPanel]    = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);

  const login = (pass) => {
    if (pass === ADMIN_PASS) {
      setIsAdmin(true);
      try { localStorage.setItem(ADMIN_KEY, 'true'); } catch {}
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
    try { localStorage.removeItem(ADMIN_KEY); } catch {}
    setAdminPanel(false);
  };

  // Editor drafts survive reloads. Non-admin visitors never write, so this
  // only ever contains the owner's own local edits.
  useEffect(() => {
    if (!isAdmin) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, settings, timeline, testimonials, baseSig: DEPLOY_SIG, savedAt: Date.now() }));
    } catch {}
  }, [isAdmin, projects, settings, timeline, testimonials]);

  // The GitHub PAT is kept in sessionStorage only: it dies with the tab
  // instead of persisting on the machine. (One-time migration clears the
  // old localStorage copy.)
  const [githubToken, setGithubToken] = useState(() => {
    try {
      localStorage.removeItem('arch_github_token');
      return sessionStorage.getItem('arch_github_token') || '';
    } catch { return ''; }
  });

  useEffect(() => {
    try {
      if (githubToken) sessionStorage.setItem('arch_github_token', githubToken);
      else sessionStorage.removeItem('arch_github_token');
    } catch {}
  }, [githubToken]);

  // GoatCounter's read-API token follows the exact same sessionStorage-only
  // pattern as the GitHub PAT: never persisted to localStorage, dies with the tab.
  const [goatcounterApiToken, setGoatcounterApiToken] = useState(() => {
    try {
      return sessionStorage.getItem('arch_goatcounter_token') || '';
    } catch { return ''; }
  });

  useEffect(() => {
    try {
      if (goatcounterApiToken) sessionStorage.setItem('arch_goatcounter_token', goatcounterApiToken);
      else sessionStorage.removeItem('arch_goatcounter_token');
    } catch {}
  }, [goatcounterApiToken]);

  const pushToGithub = async (newProjects, newSettings = settings, newTimeline = timeline, newTestimonials = testimonials) => {
    if (!githubToken) return;
    try {
      const owner = 'NAJDAWI-dot';
      const repo = 'digital-museum';
      const path = 'src/data/projects.js';
      
      const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: { Authorization: `Bearer ${githubToken}` }
      });
      const getJson = await getRes.json();
      
      const fileContent = `// Auto-generated by Museum Editor\nexport const INITIAL_PROJECTS = ${JSON.stringify(newProjects, null, 2)};\n\nexport const SITE_SETTINGS = ${JSON.stringify(newSettings, null, 2)};\n\nexport const INITIAL_TIMELINE = ${JSON.stringify(newTimeline, null, 2)};\n\nexport const INITIAL_TESTIMONIALS = ${JSON.stringify(newTestimonials, null, 2)};\n`;
      
      // Handle unicode base64 encoding correctly
      const encodedContent = btoa(new TextEncoder().encode(fileContent).reduce((data, byte) => data + String.fromCharCode(byte), ''));

      await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${githubToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'chore: auto-update projects, settings, and timeline from live editor',
          content: encodedContent,
          sha: getJson.sha
        })
      });
    } catch (e) {
      console.error('Auto-sync failed:', e);
    }
  };

  const addProject    = (p) => { 
    const np = { ...p, id: `p${Date.now()}` }; 
    setProjects(prev => { const arr = [np, ...prev]; pushToGithub(arr, settings, timeline); return arr; }); 
    return np; 
  };
  const updateProject = (id, u) => setProjects(prev => {
    const arr = prev.map(p => p.id === id ? { ...p, ...u } : p);
    pushToGithub(arr, settings, timeline); return arr;
  });
  const deleteProject = (id) => setProjects(prev => {
    const arr = prev.filter(p => p.id !== id);
    pushToGithub(arr, settings, timeline); return arr;
  });
  const moveProject   = (fromIdx, toIdx) => setProjects(prev => {
    const arr = [...prev];
    const [m] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, m);
    pushToGithub(arr, settings, timeline); return arr;
  });

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    pushToGithub(projects, newSettings, timeline);
  };

  const updateTimeline = (newTimeline) => {
    setTimeline(newTimeline);
    pushToGithub(projects, settings, newTimeline);
  };

  const updateTestimonials = (newTestimonials) => {
    setTestimonials(newTestimonials);
    pushToGithub(projects, settings, timeline, newTestimonials);
  };

  const resetToDefaults = () => {
    if (confirm('Reset all projects to factory defaults? This cannot be undone.')) {
      // No need to clear STORAGE_KEY here — the persist effect re-writes it with
      // the current DEPLOY_SIG, and the next deploy's signature change retires it.
      setProjects(INITIAL_PROJECTS);
      setTimeline(INITIAL_TIMELINE || []);
      setSettings(SITE_SETTINGS);
      setTestimonials(INITIAL_TESTIMONIALS || []);
      pushToGithub(INITIAL_PROJECTS, SITE_SETTINGS, INITIAL_TIMELINE, INITIAL_TESTIMONIALS);
    }
  };

  return (
    <MuseumContext.Provider value={{
      projects, addProject, updateProject, deleteProject, moveProject, resetToDefaults,
      settings, updateSettings,
      timeline, updateTimeline,
      testimonials, updateTestimonials,
      isAdmin, login, logout,
      adminPanel, setAdminPanel,
      editingProject, setEditingProject,
      viewingProject, setViewingProject,
      githubToken, setGithubToken,
      goatcounterApiToken, setGoatcounterApiToken
    }}>
      {children}
    </MuseumContext.Provider>
  );
}

export const useMuseum = () => useContext(MuseumContext);
