import React, { useEffect, useRef, useState } from 'react';
import { resolveAsset } from '../lib/assets';
import './AudioGuide.css';

// The audio-guide handset: an optional narrated clip per exhibit, played
// from the project modal. howler (~7KB) loads on the first press of play,
// never sooner. One clip at a time; unmounting (modal close, project
// switch) stops playback.

export default function AudioGuide({ src, number }) {
  const [state, setState] = useState('idle'); // idle | loading | playing | paused | error
  const [progress, setProgress] = useState(0);
  const howlRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    howlRef.current?.unload();
  }, []);

  const tick = () => {
    const h = howlRef.current;
    if (h?.playing()) {
      setProgress(h.duration() ? h.seek() / h.duration() : 0);
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const toggle = async () => {
    if (state === 'playing') {
      howlRef.current?.pause();
      setState('paused');
      return;
    }
    if (howlRef.current) {
      howlRef.current.play();
      setState('playing');
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    setState('loading');
    try {
      const { Howl } = await import('howler');
      const howl = new Howl({
        src: [resolveAsset(src)],
        html5: true, // stream — narration can be minutes long
        onend: () => { setState('paused'); setProgress(0); },
        onloaderror: () => setState('error'),
        onplayerror: () => setState('error'),
      });
      howlRef.current = howl;
      howl.play();
      setState('playing');
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setState('error');
    }
  };

  if (state === 'error') return null; // a broken clip should never mar the exhibit

  return (
    <button type="button" className="audio-guide mono" onClick={toggle} aria-pressed={state === 'playing'}>
      <span className="audio-guide-icon" aria-hidden="true">
        {state === 'playing' ? '❚❚' : '▶'}
      </span>
      {state === 'loading' ? 'Tuning in…' : `Audio guide${number ? ` · №${number}` : ''}`}
      <span className="audio-guide-track" aria-hidden="true">
        <span className="audio-guide-fill" style={{ transform: `scaleX(${progress})` }} />
      </span>
    </button>
  );
}
