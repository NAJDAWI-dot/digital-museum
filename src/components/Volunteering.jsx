import React, { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useMuseum } from '../context/MuseumContext';
import { resolveAsset } from '../lib/assets';
import { Lightbox } from './ProjectModal';
import './Volunteering.css';

/* Static tilts for the print stack — indexed, not random, so SSR/replay stay stable. */
const TILTS = [-2.4, 1.8, -1.2, 2.6];

/* "2025 - Present" → "2025" for the engraved ghost numeral. */
const ghostYear = (year) => (String(year).match(/\d{4}/) || [String(year).slice(0, 4)])[0];

/* The wing of service — engraved plaques on the museum wall. Each entry is a
   double-framed plaque with an oversized ghost year (the hero's gold-outline
   treatment) and its photos stacked like mat-framed prints on a curator's desk. */
/* The wall shows the latest few plaques; the rest wait behind "Show more". */
const VISIBLE_DEFAULT = 3;

export default function Volunteering() {
  const { volunteering } = useMuseum();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  // { photos: [...], idx: number } while the lightbox is open, else null
  const [lightbox, setLightbox] = useState(null);
  const [showAll, setShowAll] = useState(false);

  if (!volunteering || volunteering.length === 0) return null;

  // Entries are stored newest-first, so the first three are the latest.
  const visible = showAll ? volunteering : volunteering.slice(0, VISIBLE_DEFAULT);
  const hiddenCount = volunteering.length - VISIBLE_DEFAULT;

  return (
    <section id="volunteering" className="volunteering-section" ref={ref}>
      <div className="container">
        <header className="vol-header">
          <div>
            <h2 className="vol-title serif">Volunteering</h2>
            <p className="vol-subtitle mono">Service beyond the exhibits</p>
          </div>
          <span className="vol-count mono">
            {String(volunteering.length).padStart(2, '0')} {volunteering.length === 1 ? 'entry' : 'entries'}
          </span>
        </header>
        <div className="animated-rule vol-rule"></div>

        <ul className="vol-wall">
          {visible.map((item, i) => (
            <motion.li
              key={item.id}
              className={`vol-plaque ${i % 2 === 1 ? 'vol-plaque--flip' : ''}`}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: (i % VISIBLE_DEFAULT) * 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="vol-ghost serif" aria-hidden="true">{ghostYear(item.year)}</span>

              <div className="vol-plaque-inner">
                <div className="vol-text">
                  <span className="vol-year mono">{item.year}</span>
                  <h3 className="vol-role serif">{item.title}</h3>
                  {item.organization && <span className="vol-org">{item.organization}</span>}
                  {item.description && <p className="vol-desc">{item.description}</p>}
                </div>

                {item.photos?.length > 0 && (
                  <div className="vol-prints" role="group" aria-label={`Photos from ${item.title}`}>
                    {item.photos.map((src, pi) => (
                      <button
                        key={pi}
                        type="button"
                        className="vol-print"
                        style={{ '--tilt': `${TILTS[pi % TILTS.length]}deg` }}
                        onClick={() => setLightbox({ photos: item.photos, idx: pi })}
                        data-cursor
                      >
                        <img
                          src={resolveAsset(src)}
                          alt={`${item.title} — photo ${pi + 1} of ${item.photos.length}`}
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.li>
          ))}
        </ul>

        {volunteering.length > VISIBLE_DEFAULT && (
          <div className="vol-more-wrap">
            <button
              type="button"
              className="vol-more mono"
              onClick={() => setShowAll(s => !s)}
              aria-expanded={showAll}
            >
              {showAll ? 'Show fewer ↑' : `Show ${hiddenCount} more ↓`}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightbox && (
          <Lightbox
            images={lightbox.photos}
            startIndex={lightbox.idx}
            onClose={() => setLightbox(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
