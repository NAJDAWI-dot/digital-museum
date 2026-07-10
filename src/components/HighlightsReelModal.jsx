import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './HighlightsReelModal.css';

/** Plays the auto-generated highlights reel (rendered offline by Remotion,
 * regenerated whenever the collection changes — see remotion/ and
 * .github/workflows/render-highlights.yml). Just a video file at
 * public/highlights.mp4, so this is a plain player, not a live composition. */
export default function HighlightsReelModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
            className="reel-modal-inner"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <video
              className="reel-modal-video"
              src={`${import.meta.env.BASE_URL}highlights.mp4`}
              controls
              autoPlay
              playsInline
            />
            <button type="button" className="reel-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
