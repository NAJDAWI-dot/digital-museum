import React, { useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useMuseum } from '../context/MuseumContext';
import { getCount, incrementCount } from '../utils/counterApi';
import Magnetic from './anim/Magnetic';
import SlidingNumber from './anim/SlidingNumber';
import './Contact.css';

const CV_COUNTER_KEY = 'cv-downloads';

export default function Contact() {
  const { settings } = useMuseum();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  const [cvDownloads, setCvDownloads] = useState(null);

  useEffect(() => {
    getCount(CV_COUNTER_KEY).then(count => {
      if (count !== null) setCvDownloads(count);
    });
  }, []);

  const handleCvClick = () => {
    incrementCount(CV_COUNTER_KEY, 'up').then(count => {
      if (count !== null) setCvDownloads(count);
    });
  };

  return (
    <section id="contact" className="contact-section" ref={ref}>
      <div className="container">
        <motion.div 
          className="contact-inner"
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="contact-content">
            <h2 className="contact-title serif">Let's build something extraordinary.</h2>
            <p className="contact-desc">
              I'm always open to discussing new projects, creative ideas or opportunities to be part of your visions.
            </p>
            
            <div className="contact-actions">
              <Magnetic>
                <a href={`mailto:${settings.email}`} className="contact-btn primary">
                  <span className="mono">Get in touch</span>
                </a>
              </Magnetic>
              {settings.cvLink && (
                <Magnetic>
                  <a
                    href={settings.cvLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-btn secondary"
                    onClick={handleCvClick}
                  >
                    <span className="mono">Download CV</span>
                  </a>
                </Magnetic>
              )}
            </div>

            {settings.cvLink && cvDownloads !== null && (
              <p className="contact-cv-count mono">
                <SlidingNumber value={cvDownloads} /> CV downloads
              </p>
            )}
          </div>

          <div className="contact-visual">
            <div className="contact-circle"></div>
            <div className="contact-circle-inner"></div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
