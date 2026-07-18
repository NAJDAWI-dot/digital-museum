import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useMuseum } from '../context/MuseumContext';
import BrassPlaque from './BrassPlaque';
import ShimmeringText from './anim/ShimmeringText';
import './Timeline.css';

export default function Timeline() {
  const { t } = useTranslation();
  const { timeline } = useMuseum();
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });

  const lineHeight = useTransform(scrollYProgress, [0.2, 0.8], ['0%', '100%']);

  if (!timeline || timeline.length === 0) return null;

  return (
    <section id="career" className="timeline-section" ref={containerRef}>
      <div className="container">
        <div className="timeline-header">
          <h2 className="timeline-title serif">{t('timeline.title')}</h2>
          <p className="timeline-subtitle mono"><ShimmeringText text={t('timeline.subtitle')} /> <BrassPlaque id={3} /></p>
        </div>

        <div className="timeline-container">
          <motion.div className="timeline-line-bg" />
          <motion.div className="timeline-line-fill" style={{ height: lineHeight }} />

          {timeline.map((item, index) => {
            const isEven = index % 2 === 0;
            return (
              <TimelineNode key={item.id} item={item} isEven={isEven} index={index} />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TimelineNode({ item, isEven, index }) {
  const nodeRef = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: nodeRef,
    offset: ['0 1', '1.2 1']
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [0.1, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [50, 0]);

  return (
    <div className={`timeline-node ${isEven ? 'even' : 'odd'}`} ref={nodeRef}>
      <div className="timeline-marker">
        <div className="timeline-marker-inner" />
      </div>
      
      <motion.div className="timeline-content" style={{ opacity, y }}>
        <span className="timeline-year mono">{item.year}</span>
        <h3 className="timeline-role serif">{item.title}</h3>
        <span className="timeline-org">{item.organization}</span>
        <p className="timeline-desc">{item.description}</p>
      </motion.div>
    </div>
  );
}
