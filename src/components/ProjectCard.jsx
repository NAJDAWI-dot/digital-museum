import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useMuseum } from '../context/MuseumContext';
import './ProjectCard.css';

export default function ProjectCard({ project, index, onEdit }) {
  const { isAdmin, deleteProject, setViewingProject } = useMuseum();
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.article
      ref={ref}
      className="pcard"
      initial={{ opacity: 0, y: 56 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      data-cursor
    >
      {/* ── Swatch / Cover ── */}
      <div
        className={`pcard-swatch ${project.coverImage ? 'has-cover' : ''}`}
        style={project.coverImage
          ? { backgroundImage: `url(${project.coverImage})` }
          : { background: project.color }
        }
        onClick={() => setViewingProject(project)}
      >
        {!project.coverImage && (
          <div className="pcard-accent-dot" style={{ background: project.accentColor }}></div>
        )}
        {project.coverImage && <div className="pcard-cover-overlay"></div>}

        <div className="pcard-swatch-meta">
          <div className="pcard-year"><span className="pcard-year-text">{project.year}</span></div>
          {project.status && <div className="pcard-status"><span className="pcard-status-text">{project.status}</span></div>}
        </div>

        {/* Screenshot count badge */}
        {project.screenshots?.length > 0 && (
          <div className="pcard-photos-badge mono">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            {project.screenshots.length}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="pcard-body">
        <div className="pcard-meta">
          <span className="pcard-cat mono">{project.category}</span>
          <span className="pcard-index mono">— {String(index + 1).padStart(2, '0')}</span>
        </div>

        <div className="pcard-title-wrap">
          <h2 className="pcard-title serif">{project.title}</h2>
          {project.subtitle && <p className="pcard-subtitle">{project.subtitle}</p>}
        </div>

        <p className="pcard-desc">{project.description}</p>

        <div className="pcard-tech">
          {project.tech.map((t, i) => (
            <span key={i} className="pcard-tech-tag mono">{t}</span>
          ))}
        </div>

        <div className="pcard-footer">
          <button className="pcard-view-btn" onClick={() => setViewingProject(project)}>
            <span>Read More</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>

          <div className="pcard-links">
            <a href={project.repo} className="pcard-icon-link" aria-label="Repository" title="Repo">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
              </svg>
            </a>
            <a href={project.link} className="pcard-icon-link" aria-label="Live" title="Live">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>

          {isAdmin && (
            <div className="pcard-admin-btns">
              <button className="pcard-admin-btn edit" onClick={() => onEdit(project)} title="Edit">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button className="pcard-admin-btn delete" onClick={() => { if (confirm(`Delete "${project.title}"?`)) deleteProject(project.id); }} title="Delete">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}
