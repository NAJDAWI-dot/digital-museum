import React, { useMemo, useRef } from 'react';
import { useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Sparkles } from '@react-three/drei';
import { noise2D } from '@remotion/noise';
import { COLORS } from '../theme.js';
import useAudioPulse from '../hooks/useAudioPulse.js';

// Real 3D counterpart to AtmosphereParticles.jsx — same "three depth bands,
// Perlin-driven organic wander, audio-reactive brightness" design intent,
// but the depth is actually in Z now instead of faked with blur radius.
const BANDS = [
  { count: 26, z: [-9, -5], size: [0.05, 0.09], speed: 0.06 },
  { count: 34, z: [-5, -2], size: [0.03, 0.06], speed: 0.12 },
  { count: 22, z: [-2, 0.5], size: [0.015, 0.035], speed: 0.22 },
];

function Motes({ frame, pulse }) {
  const groupRef = useRef();
  const motes = useMemo(
    () =>
      BANDS.flatMap((band, bandIndex) =>
        Array.from({ length: band.count }, (_, i) => {
          const seed = `mote3d-${bandIndex}-${i}`;
          // noise2D(seed, 0, 0) is always exactly 0 (Perlin noise is zero at
          // integer lattice points regardless of seed) — sample at a
          // nonzero, per-mote coordinate instead so bases actually spread.
          const p = i * 1.37 + bandIndex * 7.1;
          return {
            seed,
            x: noise2D('x', p, bandIndex * 3.3) * 2.3,
            y: noise2D('y', p, bandIndex * 3.3) * 1.4,
            z: band.z[0] + (noise2D('z', p, bandIndex * 3.3) * 0.5 + 0.5) * (band.z[1] - band.z[0]),
            size: band.size[0] + (noise2D('s', p, bandIndex * 3.3) * 0.5 + 0.5) * (band.size[1] - band.size[0]),
            speed: band.speed,
          };
        })
      ),
    []
  );

  // Whole camera-rig drifts a hair on a slow orbit so depth reads even on a
  // still frame, not just via the DoF blur. Rate constants are tuned for
  // 30fps-worth-of-frames-per-second-of-motion — halved here since the
  // composition now runs at 60fps (2x as many frames per real second).
  const orbitT = frame * 0.00125;

  return (
    <group ref={groupRef} rotation={[0, orbitT, 0]}>
      {motes.map((m) => {
        const t = frame * m.speed * 0.005;
        const dx = noise2D(m.seed + '-x', t, 0) * 0.4;
        const dy = noise2D(m.seed + '-y', t, 0) * 0.4;
        const twinkle = 0.5 + (noise2D(m.seed + '-o', t * 2, 0) * 0.5 + 0.5) * 0.5;
        return (
          <mesh key={m.seed} position={[m.x + dx, m.y + dy, m.z]}>
            <sphereGeometry args={[m.size * (1 + pulse * 0.2), 8, 8]} />
            <meshBasicMaterial
              color={COLORS.gold}
              transparent
              opacity={twinkle * (1 + pulse * 0.3)}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default function AtmosphereParticles3D({ opacity = 0.5, width = 1920, height = 1080 }) {
  const frame = useCurrentFrame();
  const pulse = useAudioPulse();

  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 5], fov: 45 }}>
        <fog attach="fog" args={[COLORS.ink, 3, 14]} />
        <ambientLight intensity={0.6} />
        <Motes frame={frame} pulse={pulse} />
        <Sparkles count={40} scale={[4.6, 2.6, 6]} size={2} speed={0.15} color={COLORS.goldLight} opacity={0.4 + pulse * 0.3} />
      </ThreeCanvas>
    </div>
  );
}
