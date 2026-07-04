import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useMuseum } from '../context/MuseumContext';
import './Testimonials.css';

export default function Testimonials() {
  const { testimonials } = useMuseum();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="testimonials-section" ref={ref}>
      <div className="container">
        <motion.div
          className="testimonials-header"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="section-label">Endorsements</div>
          <h2 className="testimonials-title serif">What people say</h2>
        </motion.div>

        <div className="testimonials-grid">
          {testimonials.map((t, i) => (
            <TestimonialCard key={t.id} item={t} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ item, index, inView }) {
  return (
    <motion.figure
      className="testimonial-card"
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 * index }}
    >
      <span className="testimonial-quote-mark" aria-hidden="true">&ldquo;</span>
      <blockquote className="testimonial-quote">{item.quote}</blockquote>
      <figcaption className="testimonial-attribution">
        {item.avatarUrl ? (
          <img src={item.avatarUrl} alt="" className="testimonial-avatar" loading="lazy" decoding="async" />
        ) : (
          <span className="testimonial-avatar testimonial-avatar-fallback mono">
            {(item.name || '?').charAt(0).toUpperCase()}
          </span>
        )}
        <span className="testimonial-who">
          <span className="testimonial-name">{item.name}</span>
          {item.role && <span className="testimonial-role mono">{item.role}</span>}
        </span>
      </figcaption>
    </motion.figure>
  );
}
