import React, { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useMuseum } from '../context/MuseumContext';
import { resolveAsset } from '../lib/assets';
import { Lightbox } from './ProjectModal';
import './Volunteering.css';

/* Community service ledger — deliberately quieter than the career
   timeline: ruled catalogue rows instead of a second center-line. */
export default function Volunteering() {
  const { volunteering } = useMuseum();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  // { photos: [...], idx: number } while the lightbox is open, else null
  const [lightbox, setLightbox] = useState(null);

  if (!volunteering || volunteering.length === 0) return null;

  return (
    <section id="volunteering" className="volunteering-section" ref={ref}>
      <div className="container">
        <div className="volunteering-header">
          <h2 className="volunteering-title serif">Volunteering</h2>
          <p className="volunteering-subtitle mono">Service beyond the exhibits</p>
        </div>

        <ul className="volunteering-list">
          {volunteering.map((item, i) => (
            <motion.li
              key={item.id}
              className="volunteering-row"
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="volunteering-year mono">{item.year}</span>
              <div className="volunteering-info">
                <h3 className="volunteering-role serif">{item.title}</h3>
                {item.organization && <span className="volunteering-org">{item.organization}</span>}
                {item.description && <p className="volunteering-desc">{item.description}</p>}
                {item.photos?.length > 0 && (
                  <div className="volunteering-photos">
                    {item.photos.map((src, pi) => (
                      <button
                        key={pi}
                        type="button"
                        className="volunteering-photo"
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
