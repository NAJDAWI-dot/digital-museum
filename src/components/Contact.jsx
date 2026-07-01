import React from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import './Contact.css';

export default function Contact() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

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
              <a href="mailto:hashem.najdawi@example.com" className="contact-btn primary">
                <span className="mono">Get in touch</span>
              </a>
              <a href="/resume.pdf" target="_blank" rel="noopener noreferrer" className="contact-btn secondary">
                <span className="mono">Download CV</span>
              </a>
            </div>
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
