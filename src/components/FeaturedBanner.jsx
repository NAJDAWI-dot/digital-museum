import React from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useMuseum } from '../context/MuseumContext';
import './FeaturedBanner.css';

export default function FeaturedBanner() {
  const { projects, setViewingProject } = useMuseum();
  const featured = projects.filter(p => p.featured)[0];
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  if (!featured) return null;

  return (
    <section id="featured" className="featured-section" ref={ref}>
      <div className="container">
        <motion.div
          className="featured-inner"
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="featured-label-col">
            <div className="section-label">Editor's Pick</div>
          </div>

          <div
            className="featured-card"
            style={{ background: featured.color }}
            onClick={() => setViewingProject(featured)}
            data-cursor
          >
            <div
              className="featured-glow"
              style={{ background: featured.accentColor }}
            ></div>

            <div className="featured-card-inner">
              <div className="featured-content-wrap">
                <div className="featured-meta">
                  <span className="mono featured-cat">{featured.category}</span>
                  <span className="mono featured-year">{featured.year}</span>
                </div>

                <div className="featured-text">
                  <h2 className="featured-title serif">{featured.title}</h2>
                  <p className="featured-subtitle">{featured.subtitle}</p>
                  <p className="featured-desc">{featured.description}</p>
                </div>

                <div className="featured-footer">
                  <div className="featured-tech">
                    {featured.tech.slice(0, 3).map((t, i) => (
                      <span key={i} className="mono featured-tech-tag">{t}</span>
                    ))}
                    {featured.tech.length > 3 && (
                      <span className="mono featured-tech-tag">+{featured.tech.length - 3}</span>
                    )}
                  </div>
                  <button className="featured-cta mono" onClick={(e) => { e.stopPropagation(); setViewingProject(featured); }}>
                    Explore →
                  </button>
                </div>
              </div>

              {(featured.coverImage || (featured.images && featured.images.length > 0)) && (
                <div className="featured-image-wrap">
                  <img 
                    src={featured.coverImage || featured.images[0]} 
                    alt={featured.title} 
                    className="featured-image" 
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
