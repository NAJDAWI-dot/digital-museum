import React, { useEffect, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import './LiquidTransition.css';

const reduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// A morphing gold-edged sheet that covers the page, jumps to the target section
// while hidden, then peels away — a "liquid" page transition. Triggered by
// `window.dispatchEvent(new CustomEvent('liquid-nav', { detail: { target } }))`.
const CREST_A = 'M0,70 C240,30 480,90 720,60 C960,30 1200,90 1440,60 L1440,200 L0,200 Z';
const CREST_B = 'M0,60 C240,92 480,28 720,58 C960,92 1200,28 1440,60 L1440,200 L0,200 Z';

export default function LiquidTransition() {
  const controls = useAnimationControls();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const scrollTo = (target) => {
      const el = target && document.querySelector(target);
      if (!el) return;
      if (window.__lenis) window.__lenis.scrollTo(el, { immediate: true, force: true });
      else el.scrollIntoView();
      if (target) history.replaceState(null, '', target);
    };

    const onNav = async (e) => {
      const target = e.detail?.target;
      if (reduced) { scrollTo(target); return; }
      setActive(true);
      await controls.start('cover');
      scrollTo(target);          // jump while the screen is covered
      await controls.start('reveal');
      controls.set('hidden');
      setActive(false);
    };

    window.addEventListener('liquid-nav', onNav);
    return () => window.removeEventListener('liquid-nav', onNav);
  }, [controls]);

  const variants = {
    hidden: { y: '110%' },
    cover:  { y: '0%',    transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1] } },
    reveal: { y: '-110%', transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] } },
  };

  return (
    <motion.div
      className={`liquid-transition ${active ? 'is-active' : ''}`}
      variants={variants}
      initial="hidden"
      animate={controls}
      aria-hidden="true"
    >
      {/* Liquid crest riding the leading edge */}
      <svg className="liquid-crest" viewBox="0 0 1440 200" preserveAspectRatio="none">
        <path className="liquid-crest-fill" d={CREST_A}>
          <animate attributeName="d" dur="2.4s" repeatCount="indefinite"
            values={`${CREST_A};${CREST_B};${CREST_A}`} />
        </path>
        <path className="liquid-crest-line" fill="none"
          d="M0,70 C240,30 480,90 720,60 C960,30 1200,90 1440,60">
          <animate attributeName="d" dur="2.4s" repeatCount="indefinite"
            values="M0,70 C240,30 480,90 720,60 C960,30 1200,90 1440,60;M0,60 C240,92 480,28 720,58 C960,92 1200,28 1440,60;M0,70 C240,30 480,90 720,60 C960,30 1200,90 1440,60" />
        </path>
      </svg>
      <div className="liquid-fill" />
    </motion.div>
  );
}
