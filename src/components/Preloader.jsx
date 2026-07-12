import React, { useEffect, useRef, useState } from 'react';
import SlidingNumber from './anim/SlidingNumber';
import './Preloader.css';

const NAME    = "Hashem Najdawi";
const LETTERS = NAME.split('');

/* Curtain-lift duration — must match @keyframes pl-lift in Preloader.css. */
const LIFT_MS = 1000;

export default function Preloader({ onReveal, onDone }) {
  const wrapRef    = useRef(null);
  const lineRef    = useRef(null);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState('entering'); // entering → counting → exiting

  useEffect(() => {
    const timers = [];

    /* ── Phase 1: draw the horizontal line ── */
    timers.push(setTimeout(() => {
      if (lineRef.current) lineRef.current.classList.add('draw');
    }, 100));

    /* ── Phase 2: count up ── */
    // Stepped at ~90ms (not per-frame) so the odometer digits get room to
    // roll between values instead of blurring through them.
    let current = 0;
    let interval;
    timers.push(setTimeout(() => {
      setPhase('counting');
      interval = setInterval(() => {
        current = Math.min(100, current + Math.ceil(Math.random() * 14 + 6));
        setCount(current);
        if (current >= 100) {
          clearInterval(interval);
          /* ── Phase 3: curtain lift ── */
          timers.push(setTimeout(() => {
            setPhase('exiting');
            // Hand off the instant the curtain starts moving so the hero rises
            // into view behind it — the reveal and the lift are one gesture.
            onReveal?.();
            // Unmount only once the lift has fully cleared the viewport.
            timers.push(setTimeout(() => onDone?.(), LIFT_MS));
          }, 320));
        }
      }, 90);
    }, 400));

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [onReveal, onDone]);

  return (
    <div className={`preloader ${phase} ${phase === 'exiting' ? 'exit' : ''}`} ref={wrapRef}>
      {/* Background lines */}
      <div className="pl-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="pl-grid-line" style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>

      {/* Corner marks */}
      <div className="pl-corner pl-corner--tl" />
      <div className="pl-corner pl-corner--tr" />
      <div className="pl-corner pl-corner--bl" />
      <div className="pl-corner pl-corner--br" />

      {/* Main name — letter by letter */}
      <div className="pl-center">
        <div className="pl-name serif" aria-label={NAME}>
          {LETTERS.map((ch, i) => (
            <span
              key={i}
              className="pl-letter"
              style={{
                animationDelay: `${0.05 + i * 0.045}s`,
                '--i': i,
              }}
            >
              {ch === ' ' ? '\u00a0' : ch}
            </span>
          ))}
        </div>

        {/* Line that draws in */}
        <div className="pl-line-wrap">
          <div className="pl-line" ref={lineRef} />
        </div>

        <div className="pl-sub mono">Digital Museum</div>
      </div>

      {/* Counter — odometer digits roll to each new value */}
      <div className="pl-bottom">
        <span className="pl-counter mono">
          <SlidingNumber value={count} pad={3} />
        </span>
        <span className="pl-loading mono">Loading</span>
      </div>
    </div>
  );
}
