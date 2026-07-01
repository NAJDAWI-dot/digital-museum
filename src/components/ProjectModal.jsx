import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMuseum } from '../context/MuseumContext';
import './ProjectModal.css';

function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setIdx(i => (i + 1) % images.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <motion.div
      className="lightbox-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="lightbox-inner"
        initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
        transition={{ duration: 0.35, ease: [0.16,1,0.3,1] }}
        onClick={e => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={idx}
            src={images[idx]}
            alt={`Screenshot ${idx + 1}`}
            className="lightbox-img"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
          />
        </AnimatePresence>
        {images.length > 1 && (
          <>
            <button className="lightbox-arrow lightbox-arrow--prev" onClick={prev}>‹</button>
            <button className="lightbox-arrow lightbox-arrow--next" onClick={next}>›</button>
            <div className="lightbox-counter mono">{idx + 1} / {images.length}</div>
          </>
        )}
        <button className="lightbox-close" onClick={onClose}>×</button>
      </motion.div>
    </motion.div>
  );
}

export default function ProjectModal() {
  const { viewingProject, setViewingProject } = useMuseum();
  const proj = viewingProject;
  const [lightboxIdx, setLightboxIdx] = useState(null);

  useEffect(() => {
    document.body.style.overflow = proj ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [proj]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && lightboxIdx === null) setViewingProject(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setViewingProject, lightboxIdx]);

  const allScreenshots = proj?.screenshots || [];

  return (
    <>
      <AnimatePresence>
        {proj && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => setViewingProject(null)}
          >
            <motion.div
              className="modal-panel"
              data-lenis-prevent="true"
              initial={{ opacity: 0, y: 56, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.97 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
            >
              {/* Hero image / swatch */}
              <div
                className="modal-swatch"
                style={proj.coverImage
                  ? { backgroundImage: `url(${proj.coverImage})` }
                  : { background: proj.color }
                }
                onClick={() => proj.coverImage && setLightboxIdx(-1)}
              >
                <div
                  className="modal-swatch-glow"
                  style={{ background: proj.accentColor }}
                ></div>
                {proj.coverImage && <div className="modal-cover-overlay"></div>}

                <div className="modal-swatch-info">
                  <span className="mono modal-cat">{proj.category} · {proj.year}</span>
                  {proj.status && <span className="mono modal-status">{proj.status}</span>}
                </div>

                <button className="modal-close" onClick={() => setViewingProject(null)} aria-label="Close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="modal-body">
                {/* Header */}
                <div className="modal-header">
                  <motion.h2
                    className="modal-title serif"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.6 }}
                  >
                    {proj.title}
                  </motion.h2>
                  {proj.subtitle && (
                    <motion.p
                      className="modal-subtitle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                    >
                      {proj.subtitle}
                    </motion.p>
                  )}
                </div>

                {/* Long description */}
                <motion.p
                  className="modal-long-desc"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.6 }}
                >
                  {proj.longDescription || proj.description}
                </motion.p>

                {/* Screenshots gallery */}
                {allScreenshots.length > 0 && (
                  <motion.div
                    className="modal-gallery"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  >
                    <div className="section-label" style={{ marginBottom: '0.75rem' }}>Screenshots</div>
                    <div className="modal-gallery-grid">
                      {allScreenshots.map((src, i) => (
                        <button
                          key={i}
                          className="modal-thumb"
                          onClick={() => setLightboxIdx(i)}
                          data-cursor
                        >
                          <img src={src} alt={`Screenshot ${i + 1}`} />
                          <div className="modal-thumb-hover mono">View</div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Tech */}
                <motion.div
                  className="modal-tech-row"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.6 }}
                >
                  <div className="section-label" style={{ marginBottom: '0.75rem' }}>Stack</div>
                  <div className="modal-tech-list">
                    {proj.tech.map((t, i) => (
                      <span key={i} className="modal-tech-tag mono">{t}</span>
                    ))}
                  </div>
                </motion.div>

                {/* CTA */}
                <motion.div
                  className="modal-actions"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  <a href={proj.repo} className="modal-btn modal-btn-outline mono" target="_blank" rel="noreferrer">
                    Repository
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                  <a href={proj.link} className="modal-btn modal-btn-gold mono" target="_blank" rel="noreferrer">
                    Visit Live
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </a>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && proj && (
          <Lightbox
            images={lightboxIdx === -1 ? [proj.coverImage] : allScreenshots}
            startIndex={lightboxIdx === -1 ? 0 : lightboxIdx}
            onClose={() => setLightboxIdx(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
