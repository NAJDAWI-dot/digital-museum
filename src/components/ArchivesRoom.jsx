import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ARCHIVE_ITEMS } from '../data/archives';
import { award } from '../lib/achievements';
import './ArchivesRoom.css';

/** The Restricted Archives — the scavenger hunt's reward room. Opened via
 * the key that appears in the footer once all five plaques are found.
 * Entering awards the `archivist` medal. */
export default function ArchivesRoom({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    award('archivist');
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="archives-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={onClose}
        >
          <motion.div
            className="archives-room"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="archives-kicker mono">Staff Only · You Found the Key</p>
            <h2 className="archives-title serif">The Restricted Archives</h2>
            <div className="archives-rule" />

            <div className="archives-items">
              {ARCHIVE_ITEMS.map((item, i) => (
                <motion.div
                  key={item.label}
                  className="archives-item"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="archives-item-label mono">{item.label}</span>
                  <p className="archives-item-story serif">{item.story}</p>
                </motion.div>
              ))}
            </div>

            <button type="button" className="archives-close mono" onClick={onClose}>
              Return to the galleries →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
