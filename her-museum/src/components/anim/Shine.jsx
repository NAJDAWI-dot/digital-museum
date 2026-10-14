import React from 'react';
import './Shine.css';

/** A specular gold sheen that sweeps across the wrapped surface on hover —
 * Animate UI's Shine effect, softened to museum-glass subtlety. Purely
 * CSS-driven; this wrapper just provides the clipped streak layer above
 * the child without affecting its layout. */
export default function Shine({ children, className = '' }) {
  return (
    <span className={`shine-wrap ${className}`}>
      {children}
      <span className="shine-streak" aria-hidden="true" />
    </span>
  );
}
