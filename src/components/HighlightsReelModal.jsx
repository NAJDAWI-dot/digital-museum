import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { award } from '../lib/achievements';
import './HighlightsReelModal.css';

/** Plays the auto-generated highlights reel (rendered offline by Remotion,
 * regenerated whenever the collection changes — see remotion/ and
 * .github/workflows/render-highlights.yml). Just a video file at
 * public/highlights.mp4, so this is a plain player, not a live composition.
 * The 9:16 cut swaps in-place inside this same modal — never a link or
 * navigation, which would reload the SPA and replay the entrance splash. */
export default function HighlightsReelModal({ open, onClose }) {
  const [variant, setVariant] = useState('wide'); // 'wide' | 'vertical'

  useEffect(() => {
    if (!open) return;
    setVariant('wide'); // every opening starts with the cinematic cut
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const isVertical = variant === 'vertical';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="reel-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={onClose}
        >
          <motion.div
            className={`reel-modal-inner ${isVertical ? 'vertical' : ''}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <video
              key={variant}
              className={`reel-modal-video ${isVertical ? 'vertical' : ''}`}
              src={`${import.meta.env.BASE_URL}${isVertical ? 'highlights-vertical.mp4' : 'highlights.mp4'}`}
              poster={isVertical ? undefined : `${import.meta.env.BASE_URL}highlights-poster.jpg`}
              controls
              autoPlay
              playsInline
              onEnded={() => award('film-buff')}
            />
            <button
              type="button"
              className="reel-modal-vertical mono"
              onClick={() => setVariant(isVertical ? 'wide' : 'vertical')}
            >
              {isVertical ? '🖥 Cinematic cut (16:9)' : '📱 Vertical cut (9:16)'}
            </button>
            <button type="button" className="reel-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
