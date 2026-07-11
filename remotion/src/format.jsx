import React, { createContext, useContext } from 'react';

// 'wide' (1920×1080) or 'vertical' (1080×1920). Slides read this to adapt
// layout — type scale, stacking direction, padding — without duplicating
// any slide component. The vertical composition simply wraps the same tree
// in <FormatProvider format="vertical">.
const FormatContext = createContext('wide');

export function FormatProvider({ format, children }) {
  return <FormatContext.Provider value={format}>{children}</FormatContext.Provider>;
}

export function useFormat() {
  return useContext(FormatContext);
}

/** Pick a value by format: fmt(useFormat(), wideValue, verticalValue). */
export function fmt(format, wide, vertical) {
  return format === 'vertical' ? vertical : wide;
}
