import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useMuseum } from '../context/MuseumContext';
import { resolveAsset } from '../lib/assets';
import ExhibitCarouselMobile from './ExhibitCarouselMobile';
import './ExhibitDolly.css';

// Where each bay sits in 3D space, alternating left/right down a corridor
// so the camera dolly reads as a real walk rather than a straight tunnel.
// Desktop only — mobile renders ExhibitCarouselMobile instead (sticky +
// preserve-3d + continuously scroll-linked large 3D transforms is a known
// bad combination on mobile browsers; confirmed broken on real devices).
const BAYS = [
  { z: 0, x: 0, rotate: 0 },
  { z: -420, x: -230, rotate: 26 },
  { z: -840, x: 230, rotate: -26 },
  { z: -1260, x: 0, rotate: 0 },
];

// A dedicated scroll-through moment: the section is tall enough to hold a
// long scroll (one screen per bay), and the viewport pins in place while a
// single translateZ on the whole "world" moves the camera forward through
// it — real 3D depth, not a stack of 2D layers.
export default function ExhibitDolly() {
  const { projects } = useMuseum();
  const bays = projects.slice(0, BAYS.length);
  const sectionRef = useRef(null);

  // useScroll must run unconditionally (rules of hooks) even though its
  // result is unused on the mobile path below.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isNarrow =
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 768px)').matches;

  const worldZ = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : 1500]);

  if (bays.length === 0) return null;

  // Mobile: a completely separate, non-scroll-linked component. Desktop
  // path below this line is unchanged from before mobile support existed.
  if (isNarrow) {
    return <ExhibitCarouselMobile projects={bays} />;
  }

  return (
    <section
      className="exhibit-dolly"
      ref={sectionRef}
      style={{ height: `${bays.length * 100}vh` }}
    >
      <div className="exhibit-dolly-viewport">
        <motion.div className="exhibit-dolly-world" style={{ translateZ: worldZ }}>
          {bays.map((project, i) => {
            const b = BAYS[i % BAYS.length];
            return (
              <div
                key={project.id || i}
                className="exhibit-dolly-panel"
                style={{ transform: `translateZ(${b.z}px) translateX(${b.x}px) rotateY(${b.rotate}deg)` }}
              >
                {project.coverImage && (
                  <div
                    className="exhibit-dolly-image"
                    style={{ backgroundImage: `url(${resolveAsset(project.coverImage)})` }}
                  />
                )}
                <div className="exhibit-dolly-cap">
                  <span className="mono">{project.category}</span>
                  <h3>{project.title}</h3>
                </div>
              </div>
            );
          })}
        </motion.div>
        <div className="exhibit-dolly-floor"></div>
        <div className="exhibit-dolly-hint mono">Scroll to walk through</div>
      </div>
    </section>
  );
}
