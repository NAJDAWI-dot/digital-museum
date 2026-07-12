import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import './TypingText.css';

const REDUCED = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Typewriter with a gold caret — types once when scrolled into view.
 * Ported from Animate UI's Typing Text; reduced-motion visitors get the
 * full line instantly (no letter-by-letter wait). The full text is always
 * present for screen readers via aria-label. */
export default function TypingText({ text, speed = 38, startDelay = 250, className = '', as: Tag = 'span' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [shown, setShown] = useState(0);
  const done = shown >= text.length;

  useEffect(() => {
    if (!inView) return;
    if (REDUCED()) { setShown(text.length); return; }
    let i = 0;
    let interval = null;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setShown(i);
        if (i >= text.length) clearInterval(interval);
      }, speed);
    }, startDelay);
    return () => { clearTimeout(start); clearInterval(interval); };
  }, [inView, text, speed, startDelay]);

  return (
    <Tag ref={ref} className={`typing-text ${className}`} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, shown)}</span>
      <span className={`typing-caret ${done ? 'done' : ''}`} aria-hidden="true" />
    </Tag>
  );
}
