import React, { useRef } from 'react';
import { useInView } from 'framer-motion';
import './HighlightText.css';

/** A translucent gold wash that sweeps in behind a phrase when it scrolls
 * into view — the marker-highlight effect from Animate UI's Highlight
 * Text, tinted museum gold and driven by a CSS background-size transition
 * (no per-frame JS). */
export default function HighlightText({ children, delay = 0, className = '', as: Tag = 'span' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });

  return (
    <Tag
      ref={ref}
      className={`highlight-text ${inView ? 'in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </Tag>
  );
}
