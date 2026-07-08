import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './GuidedTour.css';

/* Anything can start the tour by dispatching this event on window —
   keeps the trigger (Hero) decoupled from the overlay (mounted in App). */
export const TOUR_EVENT = 'museum:start-tour';
export const startTour = () => window.dispatchEvent(new Event(TOUR_EVENT));

/* Stops are matched against the DOM at start time, so sections that
   aren't rendered (e.g. empty volunteering) drop out automatically. */
const STOPS = [
  { id: 'featured',     title: "Editor's Pick",           caption: 'The centrepiece of the current collection. Tap the card for the full story.' },
  { id: 'gallery',      title: 'The Complete Collection', caption: 'Every exhibit in the archive — browse by discipline, open any card to read its plaque.' },
  { id: 'career',       title: 'Career Journey',          caption: 'The path that built the museum, milestone by milestone.' },
  { id: 'volunteering', title: 'Wing of Service',         caption: 'Contributions beyond the exhibits — organizing, mentoring, giving back.' },
  { id: 'testimonials', title: 'Visitor Remarks',         caption: 'Words from the people who worked alongside the curator.' },
  { id: 'guestbook',    title: 'The Guestbook',           caption: 'Leave a note before you go — every signature joins the permanent record.' },
  { id: 'contact',      title: "The Curator's Desk",      caption: 'Commission a work, offer a role, or simply say hello.' },
];

const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function scrollToStop(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (window.__lenis && !prefersReduced()) {
    window.__lenis.scrollTo(el, { offset: -70, duration: 1.2 });
  } else {
    el.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' });
  }
}

export default function GuidedTour() {
  const [stops, setStops] = useState(null); // null → tour inactive
  const [idx, setIdx] = useState(0);
  const cardRef = useRef(null);

  useEffect(() => {
    const start = () => {
      const available = STOPS.filter(s => document.getElementById(s.id));
      if (!available.length) return;
      setStops(available);
      setIdx(0);
      scrollToStop(available[0].id);
    };
    window.addEventListener(TOUR_EVENT, start);
    return () => window.removeEventListener(TOUR_EVENT, start);
  }, []);

  useEffect(() => {
    if (!stops) return;
    cardRef.current?.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key === 'Escape') setStops(null);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, idx]);

  const go = (dir) => {
    if (!stops) return;
    const next = idx + dir;
    if (next < 0) return;
    if (next >= stops.length) { setStops(null); return; }
    setIdx(next);
    scrollToStop(stops[next].id);
  };

  const stop = stops?.[idx];

  return (
    <AnimatePresence>
      {stop && (
        <motion.aside
          className="tour-card"
          role="dialog"
          aria-label="Guided tour"
          tabIndex={-1}
          ref={cardRef}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="tour-head">
            <span className="tour-progress mono">Guided tour — {idx + 1} of {stops.length}</span>
            <button type="button" className="tour-end mono" onClick={() => setStops(null)}>
              End
            </button>
          </div>
          <h3 className="tour-title serif">{stop.title}</h3>
          <p className="tour-caption">{stop.caption}</p>
          <div className="tour-controls">
            <button type="button" className="tour-btn mono" onClick={() => go(-1)} disabled={idx === 0}>
              ← Back
            </button>
            <button type="button" className="tour-btn tour-btn--gold mono" onClick={() => go(1)}>
              {idx === stops.length - 1 ? 'Finish tour' : 'Next →'}
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
