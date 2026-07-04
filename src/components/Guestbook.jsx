import React, { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useMuseum } from '../context/MuseumContext';
import './Guestbook.css';

export default function Guestbook() {
  const { settings } = useMuseum();
  const giscus = settings?.giscus;
  const isConfigured = Boolean(giscus?.repo && giscus?.repoId && giscus?.category && giscus?.categoryId);

  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: '-100px' });
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!isConfigured || !widgetRef.current) return;

    const container = widgetRef.current;
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-repo', giscus.repo);
    script.setAttribute('data-repo-id', giscus.repoId);
    script.setAttribute('data-category', giscus.category);
    script.setAttribute('data-category-id', giscus.categoryId);
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', 'Guestbook');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'dark_dimmed');
    script.setAttribute('data-lang', 'en');

    container.appendChild(script);

    return () => {
      // Remove everything the script injected (its own tag plus the giscus iframe)
      // so re-mounting never leaves a duplicate widget behind.
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [isConfigured, giscus?.repo, giscus?.repoId, giscus?.category, giscus?.categoryId]);

  return (
    <section id="guestbook" className="guestbook-section" ref={sectionRef}>
      <div className="container">
        <motion.div
          className="guestbook-header"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="section-label">Sign the Register</div>
          <h2 className="guestbook-title serif">Visitor's Log</h2>
          <p className="guestbook-subtitle mono">Leave a note for the next visitor</p>
        </motion.div>

        <motion.div
          className="guestbook-widget"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          {isConfigured ? (
            <div className="giscus-container" ref={widgetRef} />
          ) : (
            <div className="guestbook-placeholder mono">
              Guestbook not configured yet.
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
