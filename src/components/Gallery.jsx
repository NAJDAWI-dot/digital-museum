import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMuseum } from '../context/MuseumContext';
import ProjectCard from './ProjectCard';
import './Gallery.css';

export default function Gallery() {
  const { projects, isAdmin, setEditingProject, setAdminPanel } = useMuseum();
  const [filter, setFilter] = useState('All');

  // Only show categories that at least one project actually has — a filter tab
  // with a zero count is a dead end (clicking it always shows an empty grid).
  const cats = ['All', ...new Set(projects.map(p => p.category).filter(Boolean))];

  const filtered = filter === 'All'
    ? projects
    : projects.filter(p => p.category === filter);

  const handleEdit = (project) => {
    setEditingProject(project);
    setAdminPanel(true);
  };

  return (
    <section id="gallery" className="gallery-section">
      <div className="container">

        {/* Header */}
        <div className="gallery-header">
          <div className="gallery-header-left">
            <h2 className="gallery-title serif">
              The Complete<br />
              <em>Collection</em>
            </h2>
          </div>
          <div className="gallery-header-right">
            <p className="gallery-desc">
              Each work is a distinct chapter — an artefact of engineering,
              design, and digital craft. Browse by discipline or explore the
              archive in full.
            </p>
            {isAdmin && (
              <button
                className="gallery-add-btn"
                onClick={() => { setEditingProject(null); setAdminPanel(true); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Project
              </button>
            )}
          </div>
        </div>

        <div className="gallery-divider"></div>

        {/* Filters — the gold pill morphs between the active option */}
        <div className="gallery-filters">
          {cats.map(cat => (
            <button
              key={cat}
              className={`gallery-filter mono ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {filter === cat && (
                <motion.span
                  layoutId="filter-pill"
                  className="gallery-filter-pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              <span className="gallery-filter-label">{cat}</span>
              {cat !== 'All' && (
                <span className="gallery-filter-count">
                  {projects.filter(p => p.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        <motion.div layout className="gallery-grid">
          <AnimatePresence mode="popLayout">
            {filtered.map((proj, i) => (
              <ProjectCard key={proj.id} project={proj} index={i} onEdit={handleEdit} />
            ))}
            {filtered.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="gallery-empty"
              >
                <span className="serif">No projects in this category yet.</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
