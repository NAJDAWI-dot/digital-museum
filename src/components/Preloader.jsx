import React, { useEffect, useRef, useState } from 'react';
import './Preloader.css';

const NAME    = "Hashem Najdawi";
const LETTERS = NAME.split('');

/* Exit duration per variant — each must match the CSS animation duration
   (plus any internal delay) used by `.preloader.variant-<name>.exit`. */
const EXIT_MS = {
  curtain:  1000,
  liquid:   1150,
  wordmark: 900,
  blob:     1900,
};

/* How long after the 'exit' class is added before onReveal() fires — i.e.
   how long the hero stays hidden behind the splash once the exit starts.
   Zero for variants where the hero should rise the instant the exit begins. */
const REVEAL_DELAY = {
  curtain:  0,
  liquid:   0,
  wordmark: 0,
  blob:     1400,
};

export default function Preloader({ onReveal, onDone, variant = 'curtain' }) {
  const wrapRef    = useRef(null);
  const lineRef    = useRef(null);
  const counterRef = useRef(null);
  const [phase, setPhase] = useState('entering'); // entering → counting → exiting

  useEffect(() => {
    const timers = [];

    /* ── Phase 1: draw the horizontal line ── */
    timers.push(setTimeout(() => {
      if (lineRef.current) lineRef.current.classList.add('draw');
    }, 100));

    /* ── Phase 2: count up ── */
    let count  = 0;
    let raf;
    timers.push(setTimeout(() => {
      setPhase('counting');
      const tick = () => {
        count += Math.ceil(Math.random() * 8 + 3); // Faster count
        if (count >= 100) count = 100;
        if (counterRef.current) counterRef.current.textContent = String(count).padStart(3, '0');
        if (count < 100) raf = requestAnimationFrame(tick);
        else {
          /* ── Phase 3: exit ── */
          timers.push(setTimeout(() => {
            setPhase('exiting');
            if (wrapRef.current) wrapRef.current.classList.add('exit');
            const revealDelay = REVEAL_DELAY[variant] ?? 0;
            if (revealDelay > 0) {
              timers.push(setTimeout(() => onReveal?.(), revealDelay));
            } else {
              // Hand off the instant the exit starts so the hero rises
              // into view behind it — the reveal and the exit are one gesture.
              onReveal?.();
            }
            // Unmount only once the exit animation has fully finished.
            timers.push(setTimeout(() => onDone?.(), EXIT_MS[variant] ?? EXIT_MS.curtain));
          }, 150));
        }
      };
      raf = requestAnimationFrame(tick);
    }, 400));

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
  }, [onReveal, onDone, variant]);

  return (
    <div className={`preloader ${phase} variant-${variant}`} ref={wrapRef}>
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

      {/* Counter */}
      <div className="pl-bottom">
        <span className="pl-counter mono" ref={counterRef}>000</span>
        <span className="pl-loading mono">Loading</span>
      </div>
    </div>
  );
}
