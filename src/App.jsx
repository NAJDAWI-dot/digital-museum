import React, { useState, useEffect } from 'react';
import { MuseumProvider } from './context/MuseumContext';
import Cursor from './components/Cursor';
import Preloader from './components/Preloader';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeaturedBanner from './components/FeaturedBanner';
import Gallery from './components/Gallery';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AdminPanel from './components/AdminPanel';
import ProjectModal from './components/ProjectModal';
import Lenis from 'lenis';
import './App.css';

function MuseumApp() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
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
    <MuseumProvider>
      <MuseumApp />
    </MuseumProvider>
  );
}
