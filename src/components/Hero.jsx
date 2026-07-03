import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useMuseum } from '../context/MuseumContext';
import './Hero.css';

const EASE = [0.16, 1, 0.3, 1];

// One rehearsed entrance, sequenced from a single container so every element
// rises in the same breath the moment the curtain lifts.
const stage = {
  hidden: {},
  // Trails the curtain by a beat so the headline's mask-rise lands in the open
  // view, not behind the lifting preloader.
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.18 } },
};
const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};
const slideIn = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
};
// Masked line reveal: the .hero-headline clips overflow, the line slides up from
// below it, with a brief blur settle for a cinematic focus-pull.
const lineRise = {
  hidden: { y: '110%', filter: 'blur(6px)' },
  show: { y: 0, filter: 'blur(0px)', transition: { duration: 1.1, ease: EASE } },
};

export default function Hero({ revealed = true }) {
  const { projects } = useMuseum();
  const particlesRef = useRef(null);

  const exhibitCount = String(projects.length).padStart(2, '0');
  const disciplineCount = new Set(projects.map(p => p.category)).size;

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hold the ambient particle field until the curtain lifts: no canvas rAF
  // competing with the preloader, so the reveal stays glass-smooth.
  useEffect(() => {
    if (!revealed) return;
    const canvas = particlesRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);

    const count = 60;
    const dots  = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      o: Math.random() * 0.5 + 0.1,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = w; if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h; if (d.y > h) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,169,110,${d.o})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf); };
  }, [revealed]);

  const anim = revealed ? 'show' : 'hidden';

  return (
    <section className={`hero ${revealed ? 'hero--revealed' : ''}`} id="hero">
      <canvas className="hero-particles" ref={particlesRef}></canvas>

      <div className="hero-bg">
        <div className="hero-orb hero-orb--1"></div>
        <div className="hero-orb hero-orb--2"></div>
        <div className="hero-orb hero-orb--3"></div>

        {/* Organic morphing blobs — the path itself reshapes continuously.
            Mounted only after reveal (no paint behind the curtain) and hidden
            on mobile with the rest of .hero-bg. */}
        {revealed && !reducedMotion && (
          <>
            <svg className="hero-blob hero-blob--a" viewBox="0 0 600 600" aria-hidden="true">
              <path fill="rgba(201,169,110,0.10)">
                <animate attributeName="d" dur="22s" repeatCount="indefinite"
                  values="M300,90 C420,90 520,180 520,300 C520,420 420,510 300,510 C180,510 80,420 80,300 C80,180 180,90 300,90 Z;
                          M305,95 C445,80 515,195 525,305 C535,415 420,520 295,515 C175,510 70,415 85,295 C100,180 165,110 305,95 Z;
                          M295,85 C430,100 540,175 515,305 C495,415 425,525 300,525 C185,525 85,425 75,300 C65,175 160,70 295,85 Z;
                          M300,90 C420,90 520,180 520,300 C520,420 420,510 300,510 C180,510 80,420 80,300 C80,180 180,90 300,90 Z" />
              </path>
            </svg>
            <svg className="hero-blob hero-blob--b" viewBox="0 0 600 600" aria-hidden="true">
              <path fill="rgba(255,255,255,0.04)">
                <animate attributeName="d" dur="30s" repeatCount="indefinite"
                  values="M300,110 C410,100 500,190 505,300 C510,410 415,505 300,500 C190,495 95,410 100,300 C105,190 190,120 300,110 Z;
                          M290,100 C420,115 510,185 500,305 C490,420 405,515 295,510 C180,505 85,405 100,290 C112,185 175,90 290,100 Z;
                          M310,105 C425,95 515,200 500,310 C488,415 400,510 300,515 C185,520 90,415 95,295 C100,185 195,115 310,105 Z;
                          M300,110 C410,100 500,190 505,300 C510,410 415,505 300,500 C190,495 95,410 100,300 C105,190 190,120 300,110 Z" />
              </path>
            </svg>
          </>
        )}

        <div className="hero-noise"></div>
        <div className="hero-vignette"></div>
      </div>

      <motion.div
        className="container hero-content"
        variants={stage}
        initial="hidden"
        animate={anim}
      >
        <motion.div className="hero-eyebrow section-label" variants={slideIn}>
          Digital Museum &nbsp;·&nbsp; Est. 2023
        </motion.div>

        <h1 className="hero-headline-wrap">
          <span className="hero-headline serif">
            <motion.span className="hero-line" variants={lineRise}>
              A museum
            </motion.span>
          </span>
          <span className="hero-headline serif hero-headline--italic">
            <motion.span className="hero-line" variants={lineRise}>
              of infinite&nbsp;
              <span className="hero-gold-outline">creations</span>
            </motion.span>
          </span>
        </h1>

        <div className="hero-bottom">
          <motion.p className="hero-desc" variants={rise}>
            Engineering systems, web applications,<br />
            and digital experiences — each a chapter<br />
            in the archive of craft.
          </motion.p>

          <motion.div className="hero-cta" variants={rise}>
            <a href="#gallery" className="hero-btn">
              <span>Enter Exhibition</span>
              <span className="hero-btn-arrow">→</span>
            </a>
          </motion.div>
        </div>
      </motion.div>

      {/* Catalogue line — real counts, placard voice */}
      <motion.div
        className="hero-meta"
        initial={{ opacity: 0, y: 20 }}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ delay: 0.95, duration: 0.9, ease: EASE }}
      >
        <span className="mono hero-catalogue">
          Catalogue&nbsp;—&nbsp;{exhibitCount} exhibits&nbsp;·&nbsp;{disciplineCount} disciplines&nbsp;·&nbsp;est. 2023
        </span>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="hero-scroll-hint"
        initial={{ opacity: 0 }}
        animate={revealed ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1.4, duration: 1 }}
      >
        <div className="hero-scroll-line"></div>
        <span className="mono">Scroll</span>
      </motion.div>
    </section>
  );
}
