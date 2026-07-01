import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './Hero.css';

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function ScrambleText({ text, delay = 0, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0, raf;
    const timeout = setTimeout(() => {
      const tick = () => {
        el.textContent = text.split('').map((ch, i) => {
          if (ch === ' ') return ' ';
          if (i < frame / 2.5) return text[i];
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join('');
        frame++;
        if (frame < text.length * 2.5 + 8) raf = requestAnimationFrame(tick);
        else el.textContent = text;
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [text, delay]);
  return <span className={className} ref={ref}>{text}</span>;
}

export default function Hero() {
  const particlesRef = useRef(null);

  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;
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
  }, []);

  return (
    <section className="hero" id="hero">
      <canvas className="hero-particles" ref={particlesRef}></canvas>

      <div className="hero-bg">
        <div className="hero-orb hero-orb--1"></div>
        <div className="hero-orb hero-orb--2"></div>
        <div className="hero-orb hero-orb--3"></div>
        <div className="hero-noise"></div>
        <div className="hero-vignette"></div>
      </div>

      <div className="container hero-content">
        <motion.div
          className="hero-eyebrow section-label"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16,1,0.3,1] }}
        >
          Digital Museum &nbsp;·&nbsp; Est. 2023
        </motion.div>

        <div className="hero-headline-wrap">
          <div className="hero-headline serif">
            <motion.span
              className="hero-line"
              initial={{ y: '105%' }}
              animate={{ y: 0 }}
              transition={{ delay: 0.3, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
              A museum
            </motion.span>
          </div>
          <div className="hero-headline serif hero-headline--italic">
            <motion.span
              className="hero-line"
              initial={{ y: '105%' }}
              animate={{ y: 0 }}
              transition={{ delay: 0.45, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
              of infinite&nbsp;
              <span className="hero-gold-outline">creations</span>
            </motion.span>
          </div>
        </div>

        <div className="hero-bottom">
          <motion.p
            className="hero-desc"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.9, ease: [0.16,1,0.3,1] }}
          >
            Engineering systems, web applications,<br />
            and digital experiences — each a chapter<br />
            in the archive of craft.
          </motion.p>

          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.9, ease: [0.16,1,0.3,1] }}
          >
            <a href="#gallery" className="hero-btn">
              <span>Enter Exhibition</span>
              <span className="hero-btn-arrow">→</span>
            </a>
          </motion.div>
        </div>
      </div>

      {/* Animated counters */}
      <motion.div
        className="hero-meta"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.9, ease: [0.16,1,0.3,1] }}
      >
        {[
          { num: '06', label: 'Projects'     },
          { num: '4',  label: 'Categories'   },
          { num: '3',  label: 'Years Active' },
        ].map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <div className="hero-meta-sep"></div>}
            <div className="hero-meta-item">
              <ScrambleText text={item.num} className="hero-num serif" delay={1200 + i * 180} />
              <span className="mono">{item.label}</span>
            </div>
          </React.Fragment>
        ))}
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="hero-scroll-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
      >
        <div className="hero-scroll-line"></div>
        <span className="mono">Scroll</span>
      </motion.div>
    </section>
  );
}
