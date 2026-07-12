import React, { useState } from 'react';
import { collectPlaque, getPlaques, TOTAL_PLAQUES } from '../lib/achievements';
import './BrassPlaque.css';

/** One of five brass plaques hidden around the museum — the scavenger
 * hunt. Subtle but honest: it brightens on hover, is keyboard-focusable,
 * and stays visible enough to spot on phones (where there is no hover to
 * reveal it). A plaque never plays dead: tapping one you already collected
 * re-announces your hunt progress instead of silently ignoring you. */
export default function BrassPlaque({ id, style }) {
  const [found, setFound] = useState(() => Boolean(getPlaques()[id]));
  const [pop, setPop] = useState(false);

  const handleFind = () => {
    const { collected } = collectPlaque(id);
    if (collected) {
      setFound(true);
      setPop(true);
      setTimeout(() => setPop(false), 900);
    } else {
      // Already collected — re-toast progress so the tap always answers.
      const count = Object.keys(getPlaques()).length;
      window.dispatchEvent(new CustomEvent('museum:plaque-status', {
        detail: { count, total: TOTAL_PLAQUES },
      }));
    }
  };

  return (
    <button
      type="button"
      className={`brass-plaque ${found ? 'found' : ''} ${pop ? 'pop' : ''}`}
      style={style}
      onClick={handleFind}
      aria-label={found ? 'A brass plaque you already collected' : 'A curious brass plaque'}
      title={found ? 'Collected' : ''}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="4" y="6" width="16" height="12" rx="1.5" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    </button>
  );
}
