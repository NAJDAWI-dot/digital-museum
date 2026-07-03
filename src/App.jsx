import React, { useState, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { MuseumProvider } from './context/MuseumContext';
import Cursor from './components/Cursor';
import Preloader from './components/Preloader';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeaturedBanner from './components/FeaturedBanner';
import Gallery from './components/Gallery';
import Timeline from './components/Timeline';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AdminPanel from './components/AdminPanel';
import ProjectModal from './components/ProjectModal';
import Lenis from 'lenis';
import './App.css';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function MuseumApp() {
  // Reduced-motion visitors skip the preloader entirely.
  const [loaded, setLoaded] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion()) return; // native scrolling; Lenis smoothing off

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

    return () => lenis.destroy();
  }, []);

  // Safety net: content must never stay hidden if the preloader stalls
  // (hidden tab pausing rAF, an extension breaking timers, etc).
  useEffect(() => {
    const failsafe = setTimeout(() => setLoaded(true), 6000);
    return () => clearTimeout(failsafe);
  }, []);

  return (
    <>
      <Cursor />
      {!loaded && <Preloader onComplete={() => setLoaded(true)} />}
      <div className={`site-wrapper grain-overlay ${loaded ? 'site--visible' : 'site--hidden'}`}>
        <Navbar />
        <main>
          <Hero />
          <FeaturedBanner />
          <Gallery />
          <Timeline />
          <Contact />
        </main>
        <Footer />
      </div>
      <AdminPanel />
      <ProjectModal />
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
