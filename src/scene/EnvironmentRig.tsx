import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CameraPreset, LightingMode } from '../types/aviation';

interface EnvironmentRigProps {
  lightingMode: LightingMode;
  cameraPreset: CameraPreset;
}

const CLOUD_SEEDS = [
  [-90, 62, -55, 1.3],
  [-20, 66, -65, 1.6],
  [55, 64, -48, 1.4],
  [125, 68, -12, 1.8],
  [170, 66, 62, 2.0],
  [215, 72, 58, 1.7],
  [80, 61, 78, 1.5],
  [-130, 65, 55, 1.4],
];

export const EnvironmentRig: React.FC<EnvironmentRigProps> = ({ lightingMode, cameraPreset }) => {
  const cloudsRef = useRef<THREE.Group>(null);
  const isGlobe = cameraPreset === 'globe';

  const palette = useMemo(() => {
    if (isGlobe) {
      return {
        bg: '#030816',
        fog: '#030816',
        sunColor: '#e0f2fe',
        sunIntensity: 2.1,
        sunPos: [35, 32, 42] as [number, number, number],
        hemiSky: '#7dd3fc',
        hemiGround: '#0f172a',
        hemiIntensity: 0.75,
        bloomIntensity: 0.85,
      };
    }
    if (lightingMode === 'night') {
      return {
        bg: '#050b18',
        fog: '#071124',
        sunColor: '#93c5fd',
        sunIntensity: 0.9,
        sunPos: [-45, 55, 35] as [number, number, number],
        hemiSky: '#1e3a8a',
        hemiGround: '#090d16',
        hemiIntensity: 0.55,
        bloomIntensity: 1.05,
      };
    }
    if (lightingMode === 'sunset') {
      return {
        bg: '#261830',
        fog: '#47283b',
        sunColor: '#fb923c',
        sunIntensity: 2.4,
        sunPos: [-110, 22, 40] as [number, number, number],
        hemiSky: '#fdba74',
        hemiGround: '#1e1b2e',
        hemiIntensity: 0.75,
        bloomIntensity: 0.72,
      };
    }
    return {
      bg: '#7db4e0',
      fog: '#b8d8f0',
      sunColor: '#fffbeb',
      sunIntensity: 2.8,
      sunPos: [75, 85, 55] as [number, number, number],
      hemiSky: '#e0f2fe',
      hemiGround: '#334155',
      hemiIntensity: 0.9,
      bloomIntensity: 0.35,
    };
  }, [lightingMode, isGlobe]);

  const starGeo = useMemo(() => {
    const count = 480;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 210 + (i % 7) * 14;
      const theta = ((i * 137.5) % 360) * (Math.PI / 180);
      const phi = Math.acos(0.15 + ((i * 0.6180339) % 0.85));
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  useFrame((_, delta) => {
    if (cloudsRef.current && !isGlobe) {
      cloudsRef.current.children.forEach((c, idx) => {
        c.position.x += delta * (0.45 + (idx % 3) * 0.2);
        if (c.position.x > 250) c.position.x = -170;
      });
    }
  });

  return (
    <>
      <color attach="background" args={[palette.bg]} />
      {!isGlobe && <fog attach="fog" args={[palette.fog, 130, 310]} />}

      <ambientLight intensity={lightingMode === 'night' && !isGlobe ? 0.25 : 0.42} />
      <hemisphereLight args={[palette.hemiSky, palette.hemiGround, palette.hemiIntensity]} />

      <directionalLight
        position={palette.sunPos}
        intensity={palette.sunIntensity}
        color={palette.sunColor}
        castShadow={!isGlobe}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={260}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={75}
        shadow-camera-bottom={-75}
        shadow-bias={-0.0005}
      />

      {/* Procedural Studio / Sky Reflections without external HDR fetch */}
      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={lightingMode === 'night' ? 0.6 : 2.2}
          color={lightingMode === 'sunset' ? '#fdba74' : '#e0f2fe'}
          position={[0, 12, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[30, 30, 1]}
        />
        <Lightformer
          form="ring"
          intensity={1.5}
          color="#38bdf8"
          position={[15, 6, 15]}
          scale={12}
        />
      </Environment>

      {/* Stylized Volumetric Climbout Clouds */}
      {!isGlobe && (
        <group ref={cloudsRef}>
          {CLOUD_SEEDS.map(([cx, cy, cz, sc], idx) => (
            <group key={`cloud-${idx}`} position={[cx, cy, cz]} scale={sc}>
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[4.5, 12, 10]} />
                <meshStandardMaterial
                  color={lightingMode === 'sunset' ? '#fed7aa' : lightingMode === 'night' ? '#334155' : '#ffffff'}
                  transparent
                  opacity={lightingMode === 'night' ? 0.22 : 0.72}
                  roughness={1}
                />
              </mesh>
              <mesh position={[3.6, -0.5, 0.8]}>
                <sphereGeometry args={[3.4, 10, 10]} />
                <meshStandardMaterial
                  color={lightingMode === 'sunset' ? '#fdba74' : lightingMode === 'night' ? '#334155' : '#f8fafc'}
                  transparent
                  opacity={lightingMode === 'night' ? 0.2 : 0.68}
                  roughness={1}
                />
              </mesh>
              <mesh position={[-3.4, -0.4, -0.6]}>
                <sphereGeometry args={[3.1, 10, 10]} />
                <meshStandardMaterial
                  color={lightingMode === 'sunset' ? '#fb923c' : lightingMode === 'night' ? '#334155' : '#f1f5f9'}
                  transparent
                  opacity={lightingMode === 'night' ? 0.2 : 0.68}
                  roughness={1}
                />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Night / Orbital Starfield */}
      {(lightingMode === 'night' || isGlobe) && (
        <points geometry={starGeo}>
          <pointsMaterial color="#e0f2fe" size={0.95} transparent opacity={0.85} sizeAttenuation />
        </points>
      )}

      {/* Selective Post-Processing Bloom for HDR Emissive Lights & Exhaust */}
      <EffectComposer multisampling={4}>
        <Bloom
          mipmapBlur
          luminanceThreshold={1.08}
          luminanceSmoothing={0.25}
          intensity={palette.bloomIntensity}
        />
      </EffectComposer>
    </>
  );
};
