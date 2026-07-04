import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useMuseum } from '../context/MuseumContext';
import './NowBlock.css';

/** Formats an ISO date string as a short relative label ("today", "3d ago", "Jan 4"). */
function formatUpdated(isoString) {
  if (!isoString) return '';
  const then = new Date(isoString);
  if (isNaN(then.getTime())) return '';

  const diffMs = Date.now() - then.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NowBlock() {
  const { settings } = useMuseum();
  const nowBuilding = settings?.nowBuilding;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  if (!nowBuilding?.title) return null;

  const updated = formatUpdated(nowBuilding.updatedAt);

  return (
    <section className="now-block" ref={ref} aria-label="Currently building">
      <div className="container now-block-inner">
        <motion.div
          className="now-block-strip"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="now-block-indicator" aria-hidden="true">
            <span className="now-block-dot" />
          </span>

          <span className="mono now-block-eyebrow">Now Building</span>

          <span className="now-block-divider" aria-hidden="true" />

          <div className="now-block-text">
            <span className="now-block-title">{nowBuilding.title}</span>
            {nowBuilding.description && (
              <span className="now-block-desc">{nowBuilding.description}</span>
            )}
          </div>

          {updated && (
            <span className="mono now-block-updated">Updated {updated}</span>
          )}
        </motion.div>
      </div>
    </section>
  );
}
