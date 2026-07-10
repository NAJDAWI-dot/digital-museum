import React from 'react';
import { COLORS } from '../theme.js';

/** Thin cinematic bars — the single cheapest move that reads as "trailer"
 * rather than "screen recording". */
export default function Letterbox({ height = 44 }) {
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height, background: COLORS.ink, zIndex: 20 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height, background: COLORS.ink, zIndex: 20 }} />
    </>
  );
}
