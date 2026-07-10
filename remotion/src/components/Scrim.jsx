import React from 'react';

/** Gradient overlay so caption text stays legible over a photograph
 * without flattening the image to a dark wash. */
export default function Scrim({ from = 'bottom', strength = 0.85 }) {
  const gradient =
    from === 'bottom'
      ? `linear-gradient(180deg, transparent 35%, rgba(13,13,13,${strength}) 100%)`
      : `linear-gradient(0deg, transparent 35%, rgba(13,13,13,${strength}) 100%)`;
  return <div style={{ position: 'absolute', inset: 0, background: gradient }} />;
}
