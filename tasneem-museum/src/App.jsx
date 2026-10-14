import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { MotionConfig } from 'framer-motion';
import { MuseumProvider, useMuseum } from './context/MuseumContext';
import Cursor from './components/Cursor';
import Preloader from './components/Preloader';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeaturedBanner from './components/FeaturedBanner';
import NowBlock from './components/NowBlock';
import Gallery from './components/Gallery';
import Timeline from './components/Timeline';
import Volunteering from './components/Volunteering';
import Testimonials from './components/Testimonials';
import Contact from './components/Contact';
import Footer from './components/Footer';
import ProjectModal from './components/ProjectModal';
import GuidedTour from './components/GuidedTour';
import HelloKitty from './components/HelloKitty';
import ScrollProgress from './components/anim/ScrollProgress';
import ExhibitDolly from './components/ExhibitDolly';
import MorphDivider from './components/MorphDivider';
import LiquidTransition from './components/LiquidTransition';
import Lenis from 'lenis';
import './App.css';

// Lazy-loaded: pulls in @supabase/supabase-js (~200kB), which every visitor would
// otherwise pay for just to reach a below-the-fold, optional guestbook section.
const Guestbook = lazy(() => import('./components/Guestbook'));

// The whole editor (forms, uploaders, moderation) is owner-only —
// visitors shouldn't download a byte of it. Loaded on first open, then kept
// mounted so AnimatePresence exit animations keep working.
const AdminPanel = lazy(() => import('./components/AdminPanel'));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function MuseumApp() {
  const { adminPanel } = useMuseum();

  // Latches true on the first editor open — from then on the panel stays
  // mounted (hidden by its own AnimatePresence) so closing animates properly.
  const [editorTouched, setEditorTouched] = useState(false);
  useEffect(() => { if (adminPanel) setEditorTouched(true); }, [adminPanel]);

  // Read the preference once so it stays stable across renders and effect deps.
  const [reduced] = useState(prefersReducedMotion);

  // Two moments, deliberately separate so the hand-off is seamless:
  //  · revealed      → the curtain is lifting; the hero choreography may start.
  //  · preloaderGone → the lift has finished; the preloader can unmount.
  // Reduced-motion visitors start past both (no curtain, no choreography wait).
  const [revealed, setRevealed] = useState(reduced);
  const [preloaderGone, setPreloaderGone] = useState(reduced);

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
  }, [reduced]);


  return (
    <>
      <Cursor />
      {!preloaderGone && (
        <Preloader onReveal={handleReveal} onDone={handleDone} />
      )}
      <div className="site-wrapper grain-overlay">
        <ScrollProgress />
        <Navbar revealed={revealed} />
        <main>
          <Hero revealed={revealed} />
          <NowBlock />
          <FeaturedBanner />
          <ExhibitDolly />
          <MorphDivider />
          <Gallery />
          <MorphDivider />
          <Timeline />
          <Volunteering />
          <Testimonials />
          <Contact />
          <Suspense fallback={null}>
            <Guestbook />
          </Suspense>
        </main>
        <Footer />
      </div>
      {editorTouched && (
        <Suspense fallback={null}>
          <AdminPanel />
        </Suspense>
      )}
      <ProjectModal />
      <GuidedTour />
      <HelloKitty />
      <LiquidTransition />
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
