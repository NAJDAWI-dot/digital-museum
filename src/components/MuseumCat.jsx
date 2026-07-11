import React, { useEffect, useState, useCallback, useRef } from 'react';
import './MuseumCat.css';

const WALK_DURATION = 26_000; // one full crossing, ms
const FIRST_APPEARANCE = 45_000;

/** The museum cat. Every museum has one; ours crosses the bottom of the
 * page every few minutes, pausing mid-journey to sit. Clicking it earns an
 * ear twitch. Disabled entirely under prefers-reduced-motion. */
export default function MuseumCat() {
  const [walking, setWalking] = useState(false);
  const [direction, setDirection] = useState(1); // 1 → left-to-right
  const [twitch, setTwitch] = useState(false);
  const timerRef = useRef(null);

  const scheduleNext = useCallback((delay) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDirection(d => -d);
      setWalking(true);
    }, delay);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    scheduleNext(FIRST_APPEARANCE);
    return () => clearTimeout(timerRef.current);
  }, [scheduleNext]);

  const handleWalkEnd = () => {
    setWalking(false);
    // Wander off for 2–5 minutes before the next crossing.
    scheduleNext(120_000 + Math.random() * 180_000);
  };

  const handleClick = () => {
    setTwitch(true);
    setTimeout(() => setTwitch(false), 700);
  };

  if (!walking) return null;

  return (
    <div
      className={`museum-cat ${direction === 1 ? 'ltr' : 'rtl'} ${twitch ? 'twitch' : ''}`}
      style={{ animationDuration: `${WALK_DURATION}ms` }}
      onAnimationEnd={handleWalkEnd}
      onClick={handleClick}
      role="img"
      aria-label="The museum cat, making its rounds"
      title="The museum cat"
    >
      <span className="cat-flip"><svg viewBox="0 0 64 40" width="56" height="35" fill="currentColor">
        {/* Side-profile silhouette: body, head with ears, tail curled up */}
        <ellipse cx="30" cy="28" rx="16" ry="9" />
        <circle cx="47" cy="20" r="7.5" />
        <path className="cat-ear" d="M42 15 L43.5 7.5 L48 13 Z" />
        <path className="cat-ear" d="M48.5 13 L52.5 6.5 L53.5 14 Z" />
        <path d="M15 28 Q6 26 5 15 Q4.4 11 8 11.6 Q10.5 12 9.5 16 Q9.5 23 17 24 Z" />
        <rect x="20" y="33" width="3.4" height="6" rx="1.6" />
        <rect x="27" y="34" width="3.4" height="5" rx="1.6" />
        <rect x="35" y="34" width="3.4" height="5" rx="1.6" />
        <rect x="41" y="33" width="3.4" height="6" rx="1.6" />
      </svg></span>
    </div>
  );
}
