import React from 'react';
import { COLORS } from '../theme.js';

export default function GoldRule({ width = 64, style }) {
  return (
    <div
      style={{
        width,
        height: 1,
        background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
        ...style,
      }}
    />
  );
}
