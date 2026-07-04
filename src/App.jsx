import React, { useState, useEffect, useCallback } from 'react';
import { MotionConfig } from 'framer-motion';
import { MuseumProvider } from './context/MuseumContext';
import Cursor from './components/Cursor';
import Preloader from './components/Preloader';
import TransitionPicker from './components/TransitionPicker';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeaturedBanner from './components/FeaturedBanner';
import Gallery from './components/Gallery';
import Timeline from './components/Timeline';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AdminPanel from './components/AdminPanel';
import ProjectModal from './components/ProjectModal';
import MorphDivider from './components/MorphDivider';
import LiquidTransition from './components/LiquidTransition';
import Lenis from 'lenis';
import './App.css';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function MuseumApp() {
  // Read the preference once so it stays stable across renders and effect deps.
  const [reduced] = useState(prefersReducedMotion);

  // Two moments, deliberately separate so the hand-off is seamless:
  //  · revealed      → the curtain is lifting; the hero choreography may start.
  //  · preloaderGone → the lift has finished; the preloader can unmount.
  // Reduced-motion visitors start past both (no curtain, no choreography wait).
  const [revealed, setRevealed] = useState(reduced);
  const [preloaderGone, setPreloaderGone] = useState(reduced);
  const [transitionVariant, setTransitionVariant] = useState('curtain');
  const [replayKey, setReplayKey] = useState(0);

  // Dev-only: replay the full splash→landing sequence with a different variant.
  const replayWithVariant = (nextVariant) => {
    setTransitionVariant(nextVariant);
    setRevealed(false);
    setPreloaderGone(false);
    setReplayKey((k) => k + 1);
  };

  // Stable identity across renders — Preloader's effect depends on these, and
  // onReveal() itself triggers a parent re-render; an inline arrow here would
  // hand Preloader a new function every time, re-running its effect mid-animation
  // and restarting the whole entering→counting→exiting sequence from scratch.
  const handleReveal = useCallback(() => setRevealed(true), []);
  const handleDone = useCallback(() => setPreloaderGone(true), []);

  useEffect(() => {
    if (reduced) return; // native scrolling; Lenis smoothing off

    const lenis = new Lenis({
      lerp: 0.07,
      smoothWheel: true,
      wheelMultiplier: 1.1,
      touchMultiplier: 2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Exposed so the liquid page-transition can jump scroll without fighting Lenis.
    window.__lenis = lenis;

    return () => { lenis.destroy(); delete window.__lenis; };
  }, [reduced]);

  // Safety net: never leave the curtain up if the preloader stalls
  // (hidden tab pausing rAF, an extension breaking timers, etc).
  useEffect(() => {
    if (reduced) return;
    const failsafe = setTimeout(() => { setRevealed(true); setPreloaderGone(true); }, 6000);
    return () => clearTimeout(failsafe);
  }, [reduced, replayKey]);

  return (
    <>
      <Cursor />
      {!preloaderGone && (
        <Preloader
          key={replayKey}
          variant={transitionVariant}
          onReveal={handleReveal}
          onDone={handleDone}
        />
      )}
      <div className="site-wrapper grain-overlay">
        <Navbar revealed={revealed} wordmarkMorph={transitionVariant === 'wordmark'} />
        <main>
          <Hero revealed={revealed} />
          <FeaturedBanner />
          <MorphDivider />
          <Gallery />
          <MorphDivider />
          <Timeline />
          <Contact />
        </main>
        <Footer />
      </div>
      <AdminPanel />
      <ProjectModal />
      <LiquidTransition />
      {import.meta.env.DEV && !reduced && (
        <TransitionPicker variant={transitionVariant} onSelect={replayWithVariant} />
      )}
    </>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <MuseumProvider>
        <MuseumApp />
      </MuseumProvider>
    </MotionConfig>
  );
}
