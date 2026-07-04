import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMuseum } from '../context/MuseumContext';
import { resolveAsset, isRealLink } from '../lib/assets';
import './ProjectModal.css';

function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const innerRef = useRef(null);
  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setIdx(i => (i + 1) % images.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  setIdx(i => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % images.length);
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', onKey);
    innerRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  return (
    <motion.div
      className="lightbox-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="lightbox-inner"
        role="dialog"
        aria-modal="true"
        aria-label="Screenshot viewer"
        tabIndex={-1}
        ref={innerRef}
        initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
        transition={{ duration: 0.35, ease: [0.16,1,0.3,1] }}
        onClick={e => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={idx}
            src={resolveAsset(images[idx])}
            alt={`Screenshot ${idx + 1} of ${images.length}`}
            className="lightbox-img"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
          />
        </AnimatePresence>
        {images.length > 1 && (
          <>
            <button className="lightbox-arrow lightbox-arrow--prev" onClick={prev} aria-label="Previous screenshot">‹</button>
            <button className="lightbox-arrow lightbox-arrow--next" onClick={next} aria-label="Next screenshot">›</button>
            <div className="lightbox-counter mono">{idx + 1} / {images.length}</div>
          </>
        )}
        <button className="lightbox-close" onClick={onClose} aria-label="Close screenshot viewer">×</button>
      </motion.div>
    </motion.div>
  );
}

export default function ProjectModal() {
  const { viewingProject, setViewingProject } = useMuseum();
  const proj = viewingProject;
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = proj ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [proj]);

  // Move focus into the dialog on open; give it back on close.
  useEffect(() => {
    if (!proj) return;
    const opener = document.activeElement;
    panelRef.current?.focus();
    return () => { if (opener instanceof HTMLElement) opener.focus(); };
  }, [proj]);

  const trapFocus = (e) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusables = panelRef.current.querySelectorAll(
      'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

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
              role="dialog"
              aria-modal="true"
              aria-label={proj.title}
              tabIndex={-1}
              ref={panelRef}
              onKeyDown={trapFocus}
              data-lenis-prevent="true"
              /* Opacity-only: a scale/translate here would distort the cover's
                 layout morph. The morphing hero carries the motion instead. */
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Hero image / swatch — morphs from the gallery card via layoutId */}
              <motion.div
                layoutId={`cover-${proj.id}`}
                className="modal-swatch"
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={proj.coverImage
                  ? { backgroundImage: `url(${resolveAsset(proj.coverImage)})` }
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
              </motion.div>

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
                    <h3 className="modal-heading serif">Screenshots</h3>
                    <div className="modal-gallery-grid">
                      {allScreenshots.map((src, i) => (
                        <button
                          key={i}
                          className="modal-thumb"
                          onClick={() => setLightboxIdx(i)}
                          data-cursor
                        >
                          <img src={resolveAsset(src)} alt={`${proj.title} — screenshot ${i + 1} of ${allScreenshots.length}`} loading="lazy" decoding="async" />
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
                  <h3 className="modal-heading serif">Stack</h3>
                  <div className="modal-tech-list">
                    {proj.tech.map((t, i) => (
                      <span key={i} className="modal-tech-tag mono">{t}</span>
                    ))}
                  </div>
                </motion.div>

                {/* Collaborators */}
                {proj.collaborators && proj.collaborators.length > 0 && (
                  <motion.div
                    className="modal-collab-row"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.38, duration: 0.6 }}
                  >
                    <h3 className="modal-heading serif">Collaborators</h3>
                    <ul className="modal-collab-list">
                      {proj.collaborators.map((c, i) => (
                        <li key={i} className="modal-collab-item">
                          {isRealLink(c.url) ? (
                            <a href={c.url} className="modal-collab-name" target="_blank" rel="noreferrer">{c.name}</a>
                          ) : (
                            <span className="modal-collab-name">{c.name}</span>
                          )}
                          {c.role && <span className="modal-collab-role mono">{c.role}</span>}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* CTA */}
                {(isRealLink(proj.repo) || isRealLink(proj.link)) && (
                  <motion.div
                    className="modal-actions"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                  >
                    {isRealLink(proj.repo) && (
                      <a href={proj.repo} className="modal-btn modal-btn-outline mono" target="_blank" rel="noreferrer">
                        Repository
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                    )}
                    {isRealLink(proj.link) && (
                      <a href={proj.link} className="modal-btn modal-btn-gold mono" target="_blank" rel="noreferrer">
                        Visit Live
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </a>
                    )}
                  </motion.div>
                )}
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
