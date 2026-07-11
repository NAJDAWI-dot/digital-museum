import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SouvenirTicket from './SouvenirTicket';
import MuseumCat from './MuseumCat';
import ArchivesRoom from './ArchivesRoom';
import { award, hasAchievement, huntComplete, TOTAL_PLAQUES } from '../lib/achievements';
import './VisitorDelight.css';

const TOUR_SECTIONS = ['hero', 'featured', 'gallery', 'career', 'volunteering', 'testimonials', 'contact', 'guestbook'];

/** Mounts every visitor-delight feature and owns the shared toast rail:
 * achievement medals, plaque-hunt progress, the full-tour and historian
 * observers, the archives key, the ticket, and the cat. One component so
 * App.jsx stays clean. */
export default function VisitorDelight() {
  const [toasts, setToasts] = useState([]);
  const [archivesOpen, setArchivesOpen] = useState(false);
  const [hasKey, setHasKey] = useState(huntComplete);

  const pushToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { ...toast, id }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);

  // Achievement + plaque events → toasts.
  useEffect(() => {
    const onAchievement = (e) => {
      pushToast({ icon: e.detail.icon || '🏅', title: 'Achievement earned', body: e.detail.title });
    };
    const onPlaque = (e) => {
      const { count, total } = e.detail;
      setHasKey(count >= TOTAL_PLAQUES);
      pushToast(
        count >= total
          ? { icon: '🗝️', title: 'All plaques found!', body: 'A key appears in the museum footer…' }
          : { icon: '🜲', title: `Brass plaque ${count} of ${total}`, body: 'Keep looking — the museum hides its history.' }
      );
    };
    window.addEventListener('museum:achievement', onAchievement);
    window.addEventListener('museum:plaque', onPlaque);
    return () => {
      window.removeEventListener('museum:achievement', onAchievement);
      window.removeEventListener('museum:plaque', onPlaque);
    };
  }, [pushToast]);

  // Open-archives requests (from the footer key).
  useEffect(() => {
    const onOpen = () => setArchivesOpen(true);
    window.addEventListener('museum:open-archives', onOpen);
    return () => window.removeEventListener('museum:open-archives', onOpen);
  }, []);

  // Full tour: every wing seen at least once.
  useEffect(() => {
    if (hasAchievement('full-tour')) return;
    const seen = new Set();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) seen.add(entry.target.id);
      }
      if (seen.size >= TOUR_SECTIONS.filter(id => document.getElementById(id)).length) {
        award('full-tour');
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    // Guestbook is lazy-loaded — retry attachment briefly until its section exists.
    let attempts = 0;
    const attach = () => {
      TOUR_SECTIONS.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
      if (++attempts < 10) setTimeout(attach, 2000);
    };
    attach();
    return () => observer.disconnect();
  }, []);

  // Historian: a real dwell in the career wing (12s while it's on screen).
  useEffect(() => {
    if (hasAchievement('historian')) return;
    const el = document.getElementById('career');
    if (!el) return;
    let timer = null;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        timer = setTimeout(() => { award('historian'); observer.disconnect(); }, 12_000);
      } else {
        clearTimeout(timer);
      }
    }, { threshold: 0.35 });
    observer.observe(el);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, []);

  return (
    <>
      <SouvenirTicket />
      <MuseumCat />
      <ArchivesRoom open={archivesOpen} onClose={() => setArchivesOpen(false)} />

      {hasKey && !archivesOpen && (
        <button
          type="button"
          className="archives-key mono"
          onClick={() => setArchivesOpen(true)}
          title="The Restricted Archives"
        >
          🗝️ Restricted Archives
        </button>
      )}

      <div className="delight-toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              className="delight-toast"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="delight-toast-icon">{t.icon}</span>
              <span>
                <strong className="mono">{t.title}</strong>
                <em className="serif">{t.body}</em>
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
