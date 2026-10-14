import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import './SplittingText.css';

const EASE = [0.16, 1, 0.3, 1];

/** Per-character (or per-word) staggered reveal — rise + focus-pull, the
 * same visual language as the hero's lineRise and the reel's RevealText,
 * at a finer grain. Ported from Animate UI's Splitting Text; plays once
 * when scrolled into view. Words never break across lines: characters are
 * grouped in nowrap word spans. */
export default function SplittingText({
  text,
  by = 'char', // 'char' | 'word'
  stagger = 0.025,
  delay = 0,
  duration = 0.7,
  once = true,
  active, // optional external trigger (e.g. the hero's curtain reveal) — overrides useInView
  className = '',
  as: Tag = 'span',
}) {
  const ref = useRef(null);
  const viewTriggered = useInView(ref, { once, amount: 0.6 });
  const inView = active !== undefined ? active : viewTriggered;

  const words = String(text).split(' ');
  let unitIndex = 0;

  return (
    <Tag ref={ref} className={`splitting-text ${className}`} aria-label={text}>
      {words.map((word, w) => {
        const units = by === 'word' ? [word] : word.split('');
        return (
          <React.Fragment key={w}>
            <span className="splitting-word" aria-hidden="true">
              {units.map((unit, u) => {
                const i = unitIndex++;
                return (
                  <motion.span
                    key={u}
                    className="splitting-unit"
                    initial={{ opacity: 0, y: '0.55em', filter: 'blur(6px)' }}
                    animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
                    transition={{ duration, delay: delay + i * stagger, ease: EASE }}
                  >
                    {unit}
                  </motion.span>
                );
              })}
            </span>
            {/* Space lives BETWEEN word spans (not inside the nowrap span)
                so the browser can still break lines at word boundaries. */}
            {w < words.length - 1 && ' '}
          </React.Fragment>
        );
      })}
    </Tag>
  );
}
