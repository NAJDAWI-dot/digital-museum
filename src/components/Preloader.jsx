import React, { useEffect, useRef, useState } from 'react';
import './Preloader.css';

const NAME    = "Hashem Najdawi";
const LETTERS = NAME.split('');

export default function Preloader({ onComplete }) {
  const wrapRef    = useRef(null);
  const lineRef    = useRef(null);
  const counterRef = useRef(null);
  const [phase, setPhase] = useState('entering'); // entering → counting → exiting

  useEffect(() => {
    /* ── Phase 1: draw the horizontal line ── */
    const t1 = setTimeout(() => {
      if (lineRef.current) lineRef.current.classList.add('draw');
    }, 300);

    /* ── Phase 2: count up ── */
    let count  = 0;
    let raf;
    const t2 = setTimeout(() => {
      setPhase('counting');
      const tick = () => {
        count += Math.ceil(Math.random() * 4);
        if (count >= 100) count = 100;
        if (counterRef.current) counterRef.current.textContent = String(count).padStart(3, '0');
        if (count < 100) raf = requestAnimationFrame(tick);
        else {
          /* ── Phase 3: exit animation ── */
          setTimeout(() => {
            setPhase('exiting');
            if (wrapRef.current) {
              wrapRef.current.classList.add('exit');
            }
            setTimeout(onComplete, 1100);
          }, 400);
        }
      };
      raf = requestAnimationFrame(tick);
    }, 900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      cancelAnimationFrame(raf);
    };
  }, [onComplete]);

  return (
    <div className={`preloader ${phase}`} ref={wrapRef}>
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
