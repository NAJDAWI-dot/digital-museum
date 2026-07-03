import React from 'react';
import './MorphDivider.css';

const reduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// A horizontal gold hairline that morphs its wave. Static (flat) line for
// reduced-motion users. Decorative only, so aria-hidden.
export default function MorphDivider() {
  return (
    <div className="morph-divider" aria-hidden="true">
      <svg
        className="morph-divider-svg"
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="morph-divider-gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c9a96e" stopOpacity="0" />
            <stop offset="0.5" stopColor="#c9a96e" stopOpacity="0.8" />
            <stop offset="1" stopColor="#c9a96e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          fill="none"
          stroke="url(#morph-divider-gold)"
          strokeWidth="1.5"
          d="M0,30 C288,30 576,30 720,30 C864,30 1152,30 1440,30"
        >
          {!reduced && (
            <animate
              attributeName="d"
              dur="9s"
              repeatCount="indefinite"
              values="M0,30 C288,12 576,48 720,30 C864,12 1152,48 1440,30;
                      M0,30 C288,48 576,12 720,30 C864,48 1152,12 1440,30;
                      M0,30 C288,12 576,48 720,30 C864,12 1152,48 1440,30"
            />
          )}
        </path>
      </svg>
    </div>
  );
}
