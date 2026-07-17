import React, { useEffect, useState } from 'react';
import { resolveAsset } from '../lib/assets';
import './ModelViewer.css';

// The Maquette: an interactive 3D scale model of the project on its plinth,
// rendered by <model-viewer> (a web component). The ~100KB library loads
// only when a project that has a model is actually opened — projects
// without one never pay for it. AR ("view in your space") comes free on
// phones that support it.

const REDUCED = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function ModelViewer({ src, poster, label }) {
  const [ready, setReady] = useState(() => Boolean(customElements.get('model-viewer')));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    import('@google/model-viewer')
      .then(() => { if (!cancelled) setReady(true); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [ready]);

  if (failed) return null; // the section simply doesn't render — never an error state for visitors

  return (
    <div className="maquette-plinth">
      {ready ? (
        <model-viewer
          class="maquette-viewer"
          src={resolveAsset(src)}
          poster={poster ? resolveAsset(poster) : undefined}
          alt={`Interactive 3D model of ${label}`}
          camera-controls
          touch-action="pan-y"
          auto-rotate={REDUCED() ? undefined : true}
          auto-rotate-delay="1500"
          rotation-per-second="18deg"
          shadow-intensity="0.8"
          exposure="0.9"
          ar
          ar-modes="webxr scene-viewer quick-look"
          loading="eager"
        >
          <span slot="progress-bar" className="maquette-progress mono">Preparing the maquette…</span>
        </model-viewer>
      ) : (
        <div className="maquette-loading mono">Preparing the maquette…</div>
      )}
      <p className="maquette-hint mono">Drag to orbit · pinch to zoom</p>
    </div>
  );
}
