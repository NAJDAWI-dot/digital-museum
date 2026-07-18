import React, { useEffect, useRef, useState } from 'react';
import { resolveAsset } from '../lib/assets';
import './AudioGuide.css';

// The audio-guide handset: an optional narrated clip per exhibit, played
// from the project modal. howler (~7KB) loads on the first press of play,
// never sooner. One clip at a time; unmounting (modal close, project
// switch) stops playback.

// Binary search for the word whose [start, end) window contains `time`.
// Timestamps arrive sorted (ElevenLabs emits them in reading order), so this
// is a plain sorted-array search, not a scan — matters for long narrations
// polled every animation frame.
function wordIndexAt(words, time) {
  let lo = 0, hi = words.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const w = words[mid];
    if (time < w.start) hi = mid - 1;
    else if (time >= w.end) lo = mid + 1;
    else return mid;
  }
  return -1;
}

export default function AudioGuide({ src, number, timestamps }) {
  const [state, setState] = useState('idle'); // idle | loading | playing | paused | error
  const [progress, setProgress] = useState(0);
  const [activeWord, setActiveWord] = useState(-1);
  const howlRef = useRef(null);
  const rafRef = useRef(null);
  const hasTranscript = Array.isArray(timestamps) && timestamps.length > 0;

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    howlRef.current?.unload();
  }, []);

  const tick = () => {
    const h = howlRef.current;
    if (h?.playing()) {
      const seek = h.seek();
      setProgress(h.duration() ? seek / h.duration() : 0);
      if (hasTranscript) setActiveWord(wordIndexAt(timestamps, seek));
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
        onend: () => { setState('paused'); setProgress(0); setActiveWord(-1); },
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
    <div className="audio-guide-wrap">
      <button type="button" className="audio-guide mono" onClick={toggle} aria-pressed={state === 'playing'}>
        <span className="audio-guide-icon" aria-hidden="true">
          {state === 'playing' ? '❚❚' : '▶'}
        </span>
        {state === 'loading' ? 'Tuning in…' : `Audio guide${number ? ` · №${number}` : ''}`}
        <span className="audio-guide-track" aria-hidden="true">
          <span className="audio-guide-fill" style={{ transform: `scaleX(${progress})` }} />
        </span>
      </button>

      {hasTranscript && (
        // Not aria-live: the highlight moves every animation frame, and a
        // live region would have a screen reader announce every word as
        // it's read — the transcript is meant as visible-reading support
        // and a static text alternative, not a spoken duplicate of the audio.
        <p className="audio-guide-transcript">
          {timestamps.map((w, i) => (
            <span key={i} className={`audio-word ${i === activeWord ? 'audio-word--active' : ''}`}>
              {w.word}{' '}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
