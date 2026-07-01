import React, { useState } from 'react';
import { MuseumProvider } from './context/MuseumContext';
import Cursor from './components/Cursor';
import Preloader from './components/Preloader';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeaturedBanner from './components/FeaturedBanner';
import Gallery from './components/Gallery';
import Footer from './components/Footer';
import AdminPanel from './components/AdminPanel';
import ProjectModal from './components/ProjectModal';
import './App.css';

function MuseumApp() {
  const [loaded, setLoaded] = useState(false);

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
