import React, { useMemo, useRef } from 'react';
import { useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { Torus, Cylinder, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS } from '../theme.js';

// A coin-like gold medallion — outer torus rim, a two-tier disc face, a
// milled-edge ring of ticks, and a faceted gem at the center — lit with a
// key + rim + fill light rig plus clearcoat materials for real specular
// gold highlights, instead of the flat gradient fills used elsewhere in the
// reel. Purely additive: sits behind the existing RevealText/GoldRule
// choreography in TitleSlide/EndCard, never replaces it, since 3D-extruded
// text at 1920x1080 tends to alias badly without heavy AA.
function MilledEdge({ radius = 1.42, count = 56 }) {
  const ticks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        return [Math.cos(a) * radius, Math.sin(a) * radius, a];
      }),
    [radius, count]
  );
  return (
    <group>
      {ticks.map(([x, y, a], i) => (
        <mesh key={i} position={[x, y, 0]} rotation={[0, 0, a]}>
          <boxGeometry args={[0.045, 0.16, 0.16]} />
          <meshStandardMaterial color={COLORS.goldDark} metalness={0.9} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function Seal({ frame, pulse = 0 }) {
  const groupRef = useRef();
  // Rate constants halved for 60fps (2x the frames per real second vs. the
  // 30fps they were originally tuned at) so the turn/wobble speed is unchanged.
  const rotY = frame * 0.003;
  const wobble = Math.sin(frame * 0.01) * 0.06;

  return (
    <group ref={groupRef} rotation={[0.18 + wobble, rotY, 0]} scale={0.78} position={[0, 0, -2.1]}>
      <Torus args={[1.5, 0.13, 32, 64]}>
        <meshPhysicalMaterial
          color={COLORS.gold}
          metalness={1}
          roughness={0.22}
          clearcoat={0.6}
          clearcoatRoughness={0.15}
          reflectivity={0.9}
        />
      </Torus>

      <MilledEdge />

      {/* Flat, camera-facing surfaces get a lower metalness than the torus/
          gem — a pure metal (metalness 1) has no diffuse term, so a flat
          disc only lights up in the razor-thin band where it exactly mirrors
          a light source and reads as solid black everywhere else. A little
          diffuse response keeps the coin face visible from a range of angles
          as it slowly turns, while the torus/gem stay true mirror-gold. */}
      <Cylinder args={[1.32, 1.32, 0.1, 64]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.02]}>
        <meshPhysicalMaterial
          color={COLORS.gold}
          metalness={0.45}
          roughness={0.4}
          clearcoat={0.5}
          clearcoatRoughness={0.25}
        />
      </Cylinder>

      <Cylinder args={[0.98, 0.98, 0.06, 64]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.06]}>
        <meshPhysicalMaterial
          color={COLORS.goldLight}
          metalness={0.55}
          roughness={0.3}
          clearcoat={0.7}
          clearcoatRoughness={0.15}
        />
      </Cylinder>

      <Icosahedron args={[0.46, 1]} position={[0, 0, 0.22]}>
        <meshPhysicalMaterial
          color={COLORS.goldLight}
          metalness={1}
          roughness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.05}
          emissive={new THREE.Color(COLORS.goldLight)}
          emissiveIntensity={0.25 + pulse * 0.45}
        />
      </Icosahedron>
    </group>
  );
}

export default function GoldEmblem3D({ pulse = 0, width = 1920, height = 1080, opacity = 1 }) {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 6], fov: 40 }}>
        <ambientLight intensity={0.85} />
        {/* Key light — the main modeling light, warm and bright */}
        <directionalLight position={[4, 5, 6]} intensity={2.4} color={COLORS.goldLight} />
        {/* Rim light from behind — traces a bright edge around the coin so it
            reads as a lit object against the dark background, not a flat cutout */}
        <directionalLight position={[-3, -1, -5]} intensity={1.6} color={COLORS.white} />
        {/* Fill — softens the shadow side without killing the contrast */}
        <directionalLight position={[-4, 2, 3]} intensity={0.45} color={COLORS.gold} />
        {/* Camera-facing light — the coin's flat face is normal-aligned with
            the camera, so without a near-frontal source most of it reads as
            a dark silhouette no matter how strong the angled key light is.
            Directional (not point) so it doesn't fall off with distance. */}
        <directionalLight position={[0, 0, 10]} intensity={1.5} color={COLORS.goldLight} />
        <pointLight position={[0, 0, 4]} intensity={0.5 + pulse * 0.9} color={COLORS.goldLight} distance={8} />
        <Seal frame={frame} pulse={pulse} />
      </ThreeCanvas>
    </div>
  );
}
