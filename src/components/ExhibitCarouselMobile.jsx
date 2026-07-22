import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { resolveAsset } from '../lib/assets';
import './ExhibitCarouselMobile.css';

// Mobile replacement for the desktop scroll-driven 3D corridor. Sticky +
// preserve-3d + continuously scroll-linked large translateZ is a known-bad
// pattern on mobile browsers (confirmed broken on real devices) — this uses
// a completely different technique: a fixed 3-card coverflow, current index
// held in plain React state, advanced by drag gesture + snap, never by
// scroll position. No position: sticky, no transform-style: preserve-3d
// parent, no scroll-linked motion values.
const SWIPE_DISTANCE_THRESHOLD = 60; // px of drag to count as a swipe
const SWIPE_VELOCITY_THRESHOLD = 300; // px/s — a fast flick counts even if short

export default function ExhibitCarouselMobile({ projects }) {
  const [index, setIndex] = useState(0);
  const count = projects.length;

  const goTo = useCallback((next) => {
    setIndex(((next % count) + count) % count); // wrap both directions
  }, [count]);

  const handleDragEnd = useCallback((_, info) => {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_DISTANCE_THRESHOLD || velocity.x < -SWIPE_VELOCITY_THRESHOLD) {
      goTo(index + 1);
    } else if (offset.x > SWIPE_DISTANCE_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD) {
      goTo(index - 1);
    }
    // else: an indecisive drag springs back to center on its own — the
    // card's `animate` prop still resolves to the same offset-0 transform.
  }, [index, goTo]);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (count === 0) return null;

  // A plain static stack, not a CSS override of the draggable cards — the
  // drag/animate cards have no meaningful reduced-motion CSS-only state.
  if (reducedMotion) {
    return (
      <section className="exhibit-carousel-mobile ecm-static">
        {projects.map((project, i) => (
          <div className="ecm-static-card" key={project.id || i}>
            {project.coverImage && (
              <div
                className="ecm-image"
                style={{ backgroundImage: `url(${resolveAsset(project.coverImage)})` }}
              />
            )}
            <div className="ecm-cap">
              <span className="mono">{project.category}</span>
              <h3>{project.title}</h3>
            </div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="exhibit-carousel-mobile">
      <div className="ecm-viewport">
        {projects.map((project, i) => {
          // Only render/position the 3 cards that can be visible: prev,
          // current, next — cheap on low-end phones, no offscreen DOM cost
          // for the rest, and no per-frame scroll listener at all.
          let offset = i - index;
          if (offset > count / 2) offset -= count;
          if (offset < -count / 2) offset += count;
          if (Math.abs(offset) > 1) return null;

          const isCurrent = offset === 0;
          return (
            <motion.div
              key={project.id || i}
              className={`ecm-card ${isCurrent ? 'is-current' : 'is-neighbor'}`}
              drag={isCurrent ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={isCurrent ? handleDragEnd : undefined}
              animate={{
                x: `${offset * 78}%`,
                scale: isCurrent ? 1 : 0.82,
                rotateY: offset * -22,
                opacity: isCurrent ? 1 : 0.55,
                zIndex: isCurrent ? 2 : 1,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={() => { if (!isCurrent) goTo(i); }}
            >
              {project.coverImage && (
                <div
                  className="ecm-image"
                  style={{ backgroundImage: `url(${resolveAsset(project.coverImage)})` }}
                />
              )}
              {isCurrent && (
                <div className="ecm-cap">
                  <span className="mono">{project.category}</span>
                  <h3>{project.title}</h3>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="ecm-dots">
        {projects.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`ecm-dot ${i === index ? 'is-active' : ''}`}
            aria-label={`Go to exhibit ${i + 1}`}
            aria-current={i === index}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      <div className="ecm-hint mono">
        Swipe to explore &middot; {index + 1} / {count}
      </div>
    </section>
  );
}
