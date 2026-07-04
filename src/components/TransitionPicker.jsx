import React from 'react';
import './TransitionPicker.css';

const VARIANTS = [
  { id: 'curtain',  label: 'A · Curtain' },
  { id: 'liquid',   label: 'B · Liquid crest' },
  { id: 'wordmark', label: 'C · Wordmark morph' },
  { id: 'blob',     label: 'D · Blob takeover' },
];

// Dev-only harness for comparing splash-transition variants on localhost.
// Never rendered in production — App.jsx gates it behind import.meta.env.DEV.
export default function TransitionPicker({ variant, onSelect }) {
  return (
    <div className="transition-picker">
      <span className="transition-picker-label mono">Splash transition</span>
      <div className="transition-picker-buttons">
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`transition-picker-btn ${variant === v.id ? 'active' : ''}`}
            onClick={() => onSelect(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
