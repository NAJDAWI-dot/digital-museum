import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_PROJECTS } from '../data/projects';

const MuseumContext = createContext(null);

const STORAGE_KEY    = 'arch_museum_projects_v2';
const ADMIN_KEY      = 'arch_admin_session';
export const ADMIN_PASS = 'arch2026'; // ← change this

export function MuseumProvider({ children }) {
  const [projects, setProjects] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
    } catch { return INITIAL_PROJECTS; }
  });

  const safeGetAdmin = () => {
    try { return localStorage.getItem(ADMIN_KEY) === 'true'; }
    catch { return false; }
  };

  const [isAdmin,       setIsAdmin]       = useState(safeGetAdmin);
  const [adminPanel,    setAdminPanel]    = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); } catch {}
  }, [projects]);

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

  const addProject    = (p) => { const np = { ...p, id: `p${Date.now()}` }; setProjects(prev => [np, ...prev]); return np; };
  const updateProject = (id, u) => setProjects(prev => prev.map(p => p.id === id ? { ...p, ...u } : p));
  const deleteProject = (id) => setProjects(prev => prev.filter(p => p.id !== id));
  const moveProject   = (fromIdx, toIdx) => setProjects(prev => {
    const arr = [...prev];
    const [m] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, m);
    return arr;
  });

  const resetToDefaults = () => {
    if (confirm('Reset all projects to factory defaults? This cannot be undone.')) {
      setProjects(INITIAL_PROJECTS);
    }
  };

  return (
    <MuseumContext.Provider value={{
      projects, addProject, updateProject, deleteProject, moveProject, resetToDefaults,
      isAdmin, login, logout,
      adminPanel, setAdminPanel,
      editingProject, setEditingProject,
      viewingProject, setViewingProject,
    }}>
      {children}
    </MuseumContext.Provider>
  );
}

export const useMuseum = () => useContext(MuseumContext);
