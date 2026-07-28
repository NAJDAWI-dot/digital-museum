import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { resolveAsset } from '../lib/assets';
import ShimmeringText from './anim/ShimmeringText';
import Shine from './anim/Shine';
import HighlightsReelModal from './HighlightsReelModal';
import './Showreel.css';

// Reads the real reel duration off the video file itself (an off-DOM
// probe, never rendered) instead of hardcoding it — the render pipeline
// picks a random ~100s music window each run, so the true length drifts
// week to week.
function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function Showreel() {
  const { t } = useTranslation();
  const [reelOpen, setReelOpen] = useState(false);
  const [duration, setDuration] = useState(null);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.src = resolveAsset('highlights.mp4');
    const onLoaded = () => setDuration(formatDuration(probe.duration));
    probe.addEventListener('loadedmetadata', onLoaded);
    return () => probe.removeEventListener('loadedmetadata', onLoaded);
  }, []);

  return (
    <section id="showreel" className="showreel-section" ref={ref}>
      <div className="container">
        <motion.div
          className="showreel-inner"
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="section-label">
            <ShimmeringText text={t('highlights.eyebrow')} />
          </div>

          <h2 className="showreel-title serif">
            {t('highlights.titleMain')} <em>{t('highlights.titleAccent')}</em>
          </h2>

          <Shine className="showreel-shine">
            <div className="showreel-card" onClick={() => setReelOpen(true)} data-cursor>
              <div
                className="showreel-card-media"
                style={{ backgroundImage: `url(${resolveAsset('highlights-poster.jpg')})` }}
              >
                <div className="showreel-play-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--gold-light)">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="showreel-card-foot">
                  <span className="serif showreel-card-label">{t('hero.highlights')}</span>
                  {duration && <span className="mono showreel-card-duration">{duration}</span>}
                </div>
              </div>
            </div>
          </Shine>

          <p className="mono showreel-disclosure">{t('highlights.disclosure')}</p>
        </motion.div>
      </div>

      <HighlightsReelModal open={reelOpen} onClose={() => setReelOpen(false)} />
    </section>
  );
}
