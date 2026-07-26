import React, { useEffect, useRef, useState } from 'react';
import { resolveAsset } from '../lib/assets';

// Fallback renderer for model formats <model-viewer> can't read natively
// (STL, 3MF have no material/texture info the way glTF does — just
// geometry) — a plain three.js scene with a single studio-lit material and
// orbit controls, styled to match the glTF maquette's plinth.

const REDUCED = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function centerAndScale(object3D, THREE) {
  const box = new THREE.Box3().setFromObject(object3D);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  object3D.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = 2 / maxDim;
  object3D.scale.setScalar(scale);
}

export default function MeshViewer({ src, ext, label }) {
  const containerRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderer, controls, animationId;
    const container = containerRef.current;

    async function init() {
      const [THREE, { OrbitControls }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/controls/OrbitControls.js'),
      ]);
      if (cancelled || !container) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
      camera.position.set(0, 0.6, 3.2);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xfff4de, 0x14100a, 1.1));
      const key = new THREE.DirectionalLight(0xffedd0, 1.6);
      key.position.set(2, 3, 2);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xc9a96e, 0.6);
      rim.position.set(-2, -1, -2);
      scene.add(rim);

      const material = new THREE.MeshStandardMaterial({ color: 0xc9a96e, roughness: 0.45, metalness: 0.15 });

      let mesh;
      try {
        const url = resolveAsset(src);
        if (ext === '.stl') {
          const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
          const geometry = await new STLLoader().loadAsync(url);
          geometry.computeVertexNormals();
          mesh = new THREE.Mesh(geometry, material);
        } else {
          const { ThreeMFLoader } = await import('three/examples/jsm/loaders/3MFLoader.js');
          const object = await new ThreeMFLoader().loadAsync(url);
          object.traverse((child) => {
            if (child.isMesh && !child.material) child.material = material;
          });
          mesh = object;
        }
      } catch {
        if (!cancelled) { setFailed(true); setLoading(false); }
        return;
      }
      if (cancelled) return;

      centerAndScale(mesh, THREE);
      scene.add(mesh);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.autoRotate = !REDUCED();
      controls.autoRotateSpeed = 1.1;
      controls.minDistance = 1;
      controls.maxDistance = 8;

      const onResize = () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener('resize', onResize);

      const tick = () => {
        controls.update();
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(tick);
      };
      tick();

      setLoading(false);

      init._cleanup = () => {
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(animationId);
        controls.dispose();
        renderer.dispose();
        geometryDispose(mesh);
        container.removeChild(renderer.domElement);
      };
    }

    function geometryDispose(object3D) {
      object3D.traverse?.((child) => {
        child.geometry?.dispose?.();
        child.material?.dispose?.();
      });
      object3D.geometry?.dispose?.();
      object3D.material?.dispose?.();
    }

    init();
    return () => {
      cancelled = true;
      init._cleanup?.();
    };
  }, [src, ext]);

  if (failed) return null;

  return (
    <div className="maquette-plinth">
      <div className="maquette-mesh-wrap">
        <div ref={containerRef} className="maquette-viewer maquette-mesh-viewer" aria-label={`Interactive 3D model of ${label}`} />
        {loading && <div className="maquette-loading mono mesh-loading-overlay">Preparing the maquette…</div>}
      </div>
      <p className="maquette-hint mono">Drag to orbit · scroll to zoom</p>
    </div>
  );
}
