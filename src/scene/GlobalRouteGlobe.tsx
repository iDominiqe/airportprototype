import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { DESTINATIONS, RMO_ORIGIN } from '../data/flights';
import { Destination } from '../types/aviation';
import { getGlobeTexture } from './textures';

interface GlobalRouteGlobeProps {
  selectedDestination: Destination;
  onSelectDestination: (dest: Destination) => void;
}

const GLOBE_RADIUS = 16;

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function buildArcCurve(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radius: number,
  peakAltitude: number
): THREE.CatmullRomCurve3 {
  const p1 = latLonToVector3(lat1, lon1, radius);
  const p2 = latLonToVector3(lat2, lon2, radius);
  const dist = p1.distanceTo(p2);
  const arcHeight = Math.min(peakAltitude, dist * 0.28 + 0.65);

  const pts: THREE.Vector3[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pt = new THREE.Vector3().lerpVectors(p1, p2, t).normalize();
    const lift = Math.sin(t * Math.PI) * arcHeight;
    pt.multiplyScalar(radius + lift);
    pts.push(pt);
  }
  return new THREE.CatmullRomCurve3(pts);
}

export const GlobalRouteGlobe: React.FC<GlobalRouteGlobeProps> = ({
  selectedDestination,
  onSelectDestination,
}) => {
  const globeTex = useMemo(() => getGlobeTexture(), []);
  const planeMarkerRef = useRef<THREE.Group>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const rmoGroupRef = useRef<THREE.Group>(null);

  const rmoPos = useMemo(
    () => latLonToVector3(RMO_ORIGIN.lat, RMO_ORIGIN.lon, GLOBE_RADIUS + 0.15),
    []
  );

  React.useEffect(() => {
    if (pulseRingRef.current) {
      pulseRingRef.current.lookAt(0, 0, 0);
    }
  }, [rmoPos]);

  // Subtle background curves for all destinations
  const allRoutes = useMemo(() => {
    return DESTINATIONS.map((dest) => {
      const curve = buildArcCurve(
        RMO_ORIGIN.lat,
        RMO_ORIGIN.lon,
        dest.lat,
        dest.lon,
        GLOBE_RADIUS + 0.1,
        5.5
      );
      return {
        dest,
        pinPos: latLonToVector3(dest.lat, dest.lon, GLOBE_RADIUS + 0.15),
        tubeGeo: new THREE.TubeGeometry(curve, 48, 0.045, 6, false),
      };
    });
  }, []);

  const activeCurve = useMemo(
    () =>
      buildArcCurve(
        RMO_ORIGIN.lat,
        RMO_ORIGIN.lon,
        selectedDestination.lat,
        selectedDestination.lon,
        GLOBE_RADIUS + 0.14,
        6.2
      ),
    [selectedDestination]
  );

  const activeTubeGeo = useMemo(
    () => new THREE.TubeGeometry(activeCurve, 64, 0.14, 10, false),
    [activeCurve]
  );

  useFrame((state) => {
    const t = (state.clock.elapsedTime * 0.19) % 1;
    if (planeMarkerRef.current) {
      const pos = activeCurve.getPointAt(t);
      const tangent = activeCurve.getTangentAt(t).normalize();
      planeMarkerRef.current.position.copy(pos);
      const up = pos.clone().normalize();
      const target = pos.clone().add(tangent);
      planeMarkerRef.current.up.copy(up);
      planeMarkerRef.current.lookAt(target);
    }
    if (pulseRingRef.current) {
      const s = 1 + ((state.clock.elapsedTime * 1.1) % 1.4);
      pulseRingRef.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      {/* Main Earth Sphere */}
      <mesh receiveShadow>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 48]} />
        <meshStandardMaterial
          map={globeTex}
          roughness={0.62}
          metalness={0.22}
          emissive="#0c2647"
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* Atmospheric Fresnel Rim Shell */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 1.032, 48, 36]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.14}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Subtle Orbital Grid Rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[GLOBE_RADIUS * 1.18, 0.03, 8, 96]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.18} />
      </mesh>

      {/* Origin Hub: Chișinău (RMO) */}
      <group ref={rmoGroupRef} position={rmoPos}>
        <mesh>
          <sphereGeometry args={[0.32, 16, 16]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={4}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={pulseRingRef}>
          <ringGeometry args={[0.4, 0.56, 24]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
        <Html distanceFactor={38} position={[0, 0.9, 0]} center zIndexRange={[10, 0]}>
          <div className="px-2 py-0.5 rounded-full bg-sky-500/95 text-slate-950 font-mono text-[10px] font-bold shadow-lg whitespace-nowrap border border-sky-200/60">
            RMO · CHIȘINĂU
          </div>
        </Html>
      </group>

      {/* All Network Routes + Interactive Pins */}
      {allRoutes.map(({ dest, pinPos, tubeGeo }) => {
        const isSelected = dest.code === selectedDestination.code;
        return (
          <group key={dest.code}>
            {!isSelected && (
              <mesh geometry={tubeGeo}>
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.22} />
              </mesh>
            )}
            <group position={pinPos}>
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDestination(dest);
                }}
              >
                <sphereGeometry args={[isSelected ? 0.34 : 0.22, 14, 14]} />
                <meshStandardMaterial
                  color={isSelected ? '#fbbf24' : '#7dd3fc'}
                  emissive={isSelected ? '#f59e0b' : '#0ea5e9'}
                  emissiveIntensity={isSelected ? 4.5 : 1.8}
                  toneMapped={false}
                />
              </mesh>
              <Html distanceFactor={40} position={[0, isSelected ? 0.8 : 0.55, 0]} center zIndexRange={[10, 0]}>
                <button
                  type="button"
                  onClick={() => onSelectDestination(dest)}
                  className={`px-1.5 py-0.5 rounded-full font-mono text-[9px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-lg ring-2 ring-amber-200/70 scale-110'
                      : 'bg-slate-900/85 text-sky-100 border border-sky-400/35 hover:bg-sky-500/80 hover:text-slate-950'
                  }`}
                >
                  {isSelected ? `${dest.code} · ${dest.city}` : dest.code}
                </button>
              </Html>
            </group>
          </group>
        );
      })}

      {/* Active Glowing Great-Circle Route Arc */}
      <mesh geometry={activeTubeGeo}>
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={3.2}
          toneMapped={false}
        />
      </mesh>

      {/* Animated Aircraft Gliding Along Active Route */}
      <group ref={planeMarkerRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.28, 0.95, 8]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#7dd3fc"
            emissiveIntensity={4}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0, -0.05]}>
          <boxGeometry args={[1.05, 0.05, 0.26]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#38bdf8"
            emissiveIntensity={2.5}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
};
