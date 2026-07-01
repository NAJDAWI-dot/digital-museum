import React, { useEffect, useRef } from 'react';
import './Cursor.css';

export default function Cursor() {
  const dotRef  = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    let mx = 0, my = 0;
    let rx = 0, ry = 0;
    let raf;

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mx}px, ${my}px)`;
      }
    };

    const lerp = (a, b, t) => a + (b - a) * t;

    const tick = () => {
      rx = lerp(rx, mx, 0.08);
      ry = lerp(ry, my, 0.08);
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${rx}px, ${ry}px)`;
      }
      raf = requestAnimationFrame(tick);
    };

    const onEnterInteractive = () => {
      ringRef.current?.classList.add('hover');
      dotRef.current?.classList.add('hover');
    };
    const onLeaveInteractive = () => {
      ringRef.current?.classList.remove('hover');
      dotRef.current?.classList.remove('hover');
    };

    window.addEventListener('mousemove', onMove);
    tick();

    const addListeners = () => {
      document.querySelectorAll('a,button,input,textarea,[data-cursor]').forEach(el => {
        el.addEventListener('mouseenter', onEnterInteractive);
        el.addEventListener('mouseleave', onLeaveInteractive);
      });
    };
    addListeners();
    const observer = new MutationObserver(addListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div className="cursor-dot" ref={dotRef}></div>
      <div className="cursor-ring" ref={ringRef}></div>
    </>
  );
}
