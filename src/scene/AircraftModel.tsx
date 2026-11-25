import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AircraftVariant, AirlineLivery, GraphicsQuality, LightingMode } from '../types/aviation';
import { AIRCRAFT_SPECS, getAircraftGeometries } from './aircraftGeometry';
import { getFuselageTextures, LIVERY_PALETTES } from './aircraftTextures';

interface AircraftModelProps {
  variant: AircraftVariant;
  livery?: AirlineLivery;
  gearDeploy?: number; // 1 = down, 0 = retracted
  thrustLevel?: number; // 0..1
  landingLights?: boolean;
  lightingMode?: LightingMode;
  quality?: GraphicsQuality;
  showReverseThrust?: boolean;
  scale?: number;
}

export const AircraftModel: React.FC<AircraftModelProps> = ({
  variant,
  livery = 'nova',
  gearDeploy = 1,
  thrustLevel = 0.2,
  landingLights = false,
  lightingMode = 'day',
  quality = 'hd',
  showReverseThrust = false,
  scale = 1,
}) => {
  const isClay = quality === 'clay';
  const spec = AIRCRAFT_SPECS[variant];
  const palette = LIVERY_PALETTES[livery];
  const geos = useMemo(() => getAircraftGeometries(variant), [variant]);
  const skins = useMemo(
    () => (isClay ? null : getFuselageTextures(variant, livery)),
    [variant, livery, isClay]
  );

  const beaconTopRef = useRef<THREE.MeshStandardMaterial>(null);
  const strobeTailRef = useRef<THREE.MeshStandardMaterial>(null);
  const fanRefs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const beaconFlash = Math.sin(t * 5.2) > 0.72 ? 5.5 : 0.25;
    const strobeFlash = (t % 1.4) < 0.11 ? 7.5 : 0.15;

    if (beaconTopRef.current) beaconTopRef.current.emissiveIntensity = beaconFlash;
    if (strobeTailRef.current) strobeTailRef.current.emissiveIntensity = strobeFlash;

    const fanSpin = delta * (5 + thrustLevel * 30);
    for (const fan of fanRefs.current) {
      if (fan) fan.rotation.x += fanSpin;
    }
  });

  const nightBoost = lightingMode === 'night' ? 1.6 : lightingMode === 'sunset' ? 1.25 : 0.9;
  const windowEmissive = lightingMode === 'night' ? 2.2 : lightingMode === 'sunset' ? 1.35 : 0.28;
  const clampedGear = Math.max(0, Math.min(1, gearDeploy));
  const gearYOffset = (1 - clampedGear) * 0.42;
  const gearScale = Math.max(0.01, clampedGear);
  const exhaustGlow = (0.28 + thrustLevel * 3.8) * nightBoost;
  const exhaustScale = 0.25 + thrustLevel * 1.15;
  const fuselageCenterY = spec.radius * (spec.doubleDeck ? 1.52 : 1.36);

  // Flap track fairing positions along span
  const flapCanoeFracs = [0.24, 0.44, 0.65, 0.82];

  // Expand engine stations across both port (-Z) and starboard (+Z) wings
  const allEngines = spec.engineStations.flatMap((st, idx) => [
    { ...st, side: -1 as const, key: `L-${idx}`, index: idx * 2 },
    { ...st, side: 1 as const, key: `R-${idx}`, index: idx * 2 + 1 },
  ]);

  const noseX = spec.length * 0.43;

  return (
    <group scale={scale}>
      {/* Lofted Parametric Fuselage with Livery & Illuminated Windows */}
      <mesh geometry={geos.fuselage} position={[0, fuselageCenterY, 0]} castShadow={!isClay} receiveShadow={!isClay}>
        {isClay || !skins ? (
          <meshStandardMaterial color="#f8fafc" roughness={0.65} metalness={0.05} />
        ) : (
          <meshStandardMaterial
            map={skins.map}
            emissiveMap={skins.emissiveMap}
            emissive="#ffffff"
            emissiveIntensity={windowEmissive}
            metalness={0.28}
            roughness={0.24}
          />
        )}
      </mesh>

      {/* Aerodynamic Belly Wing-to-Body Fairing */}
      <mesh position={[0.18, fuselageCenterY - spec.radius * 0.82, 0]} scale={[2.4, 0.48, 1.05]} castShadow>
        <sphereGeometry args={[spec.radius * 0.92, 18, 12]} />
        <meshStandardMaterial color={palette.belly} metalness={0.35} roughness={0.32} />
      </mesh>

      {/* Vertical Tail Stabilizer */}
      <mesh geometry={geos.verticalTail} castShadow>
        <meshStandardMaterial color={palette.tail} metalness={0.32} roughness={0.28} />
      </mesh>

      {/* Horizontal Stabilizers */}
      <mesh geometry={geos.hStabLeft} castShadow>
        <meshStandardMaterial color="#e2e8f0" metalness={0.4} roughness={0.28} />
      </mesh>
      <mesh geometry={geos.hStabRight} castShadow>
        <meshStandardMaterial color="#e2e8f0" metalness={0.4} roughness={0.28} />
      </mesh>

      {/* Lofted Airfoil Main Wings + Flap-Track Fairings + Signature Winglets */}
      <group position={[0.1, fuselageCenterY - spec.radius * 0.48, 0]}>
        <mesh geometry={geos.wingLeft} castShadow receiveShadow>
          <meshStandardMaterial color="#e2e8f0" metalness={0.45} roughness={0.26} />
        </mesh>
        <mesh geometry={geos.wingRight} castShadow receiveShadow>
          <meshStandardMaterial color="#e2e8f0" metalness={0.45} roughness={0.26} />
        </mesh>

        {/* Winglets / Curved Sharklets / Wingtip Fences */}
        <mesh geometry={geos.wingletLeft} castShadow>
          <meshStandardMaterial color={palette.tail} metalness={0.38} roughness={0.28} />
        </mesh>
        <mesh geometry={geos.wingletRight} castShadow>
          <meshStandardMaterial color={palette.tail} metalness={0.38} roughness={0.28} />
        </mesh>

        {/* Underwing Flap-Track Fairing Canoes (as in A350 / A380 blueprints) */}
        {[-1, 1].map((side) =>
          flapCanoeFracs.map((f, idx) => {
            const cz = side * f * spec.wingspan;
            const chord = THREE.MathUtils.lerp(spec.rootChord, spec.tipChord, f);
            const leadX = 0.85 - f * spec.sweep;
            const cy = Math.pow(f, 1.15) * spec.dihedral - 0.055;
            return (
              <mesh
                key={`canoe-${side}-${idx}`}
                position={[leadX - chord * 0.86, cy, cz]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <capsuleGeometry args={[0.036, chord * 0.34, 4, 8]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.4} roughness={0.32} />
              </mesh>
            );
          })
        )}

        {/* Wingtip Navigation Lights (Red Port -Z, Green Starboard +Z) */}
        <mesh position={[0.85 - spec.sweep - 0.14, spec.dihedral + 0.08, -spec.wingspan]}>
          <sphereGeometry args={[0.068, 10, 10]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#ff2a2a"
            emissiveIntensity={2.8 * nightBoost}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0.85 - spec.sweep - 0.14, spec.dihedral + 0.08, spec.wingspan]}>
          <sphereGeometry args={[0.068, 10, 10]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22ff66"
            emissiveIntensity={2.8 * nightBoost}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Underwing High-Bypass Turbofan Engines (2 or 4 depending on aircraft) */}
      {allEngines.map((eng) => (
        <group
          key={eng.key}
          position={[eng.x, eng.y, eng.side * eng.z]}
        >
          {/* Swept Wing Pylon */}
          <mesh position={[-0.12, spec.engineRadius * 0.95, 0]} castShadow>
            <boxGeometry args={[spec.engineRadius * 2.5, spec.engineRadius * 0.9, 0.09]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.55} roughness={0.3} />
          </mesh>
          {/* Lathed Cowling */}
          <mesh geometry={geos.nacelle} castShadow>
            <meshStandardMaterial color={palette.engine} metalness={0.42} roughness={0.24} />
          </mesh>
          {/* Chrome Intake Lip */}
          <mesh rotation={[0, Math.PI / 2, 0]} position={[spec.engineRadius * 2.02, 0, 0]}>
            <torusGeometry args={[spec.engineRadius * 0.95, 0.032, 10, 22]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.92} roughness={0.1} />
          </mesh>
          {/* Spinning Turbofan Rotor Disk */}
          <mesh
            ref={(el) => {
              fanRefs.current[eng.index] = el;
            }}
            rotation={[0, 0, Math.PI / 2]}
            position={[spec.engineRadius * 1.75, 0, 0]}
          >
            <cylinderGeometry args={[spec.engineRadius * 0.86, spec.engineRadius * 0.86, 0.04, 14]} />
            <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.3} />
          </mesh>
          {/* Exhaust Core + Glowing Thrust Plume */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[-spec.engineRadius * 2.15, 0, 0]}>
            <cylinderGeometry args={[spec.engineRadius * 0.54, spec.engineRadius * 0.68, 0.16, 16]} />
            <meshStandardMaterial
              color="#fb923c"
              emissive={thrustLevel > 0.55 ? '#ff7b00' : '#f97316'}
              emissiveIntensity={exhaustGlow}
              toneMapped={false}
            />
          </mesh>
          {thrustLevel > 0.35 && (
            <mesh
              rotation={[0, 0, Math.PI / 2]}
              position={[-spec.engineRadius * 2.35 - exhaustScale * 0.48, 0, 0]}
            >
              <coneGeometry args={[spec.engineRadius * 0.6, exhaustScale * 1.25, 16]} />
              <meshBasicMaterial
                color={thrustLevel > 0.78 ? '#60a5fa' : '#fb923c'}
                transparent
                opacity={Math.min(0.62, thrustLevel * 0.55)}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          )}
          {showReverseThrust && (
            <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[spec.engineRadius * 1.14, spec.engineRadius * 1.14, 0.24, 16]} />
              <meshBasicMaterial color="#fdba74" transparent opacity={0.42} />
            </mesh>
          )}
        </group>
      ))}

      {/* Articulated Retractable Landing Gear */}
      {clampedGear > 0.04 && (
        <group position={[0, gearYOffset, 0]} scale={[1, gearScale, 1]}>
          {/* Nose Gear */}
          <group position={[noseX * 0.84, spec.radius * 0.55, 0]}>
            <mesh position={[0, -0.24, 0]}>
              <cylinderGeometry args={[0.036, 0.036, 0.54, 8]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.82} roughness={0.22} />
            </mesh>
            {[-0.05, 0.05].map((dz) => (
              <mesh key={`nose-w-${dz}`} position={[0, -0.48, dz]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.055, 12]} />
                <meshStandardMaterial color="#0f172a" roughness={0.85} />
              </mesh>
            ))}
          </group>

          {/* Main Gear Bogies (6-wheel bogies on A380, 4-wheel on others) */}
          {[-1, 1].map((side) => (
            <group
              key={`gear-${side}`}
              position={[-0.15, spec.radius * 0.55, side * (spec.radius * 1.38)]}
            >
              <mesh position={[0, -0.26, 0]}>
                <cylinderGeometry args={[0.045, 0.045, 0.56, 8]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.82} roughness={0.22} />
              </mesh>
              {(spec.doubleDeck ? [-0.14, 0, 0.14] : [-0.08, 0.08]).map((dx) =>
                [-0.065, 0.065].map((dz) => (
                  <mesh
                    key={`wheel-${dx}-${dz}`}
                    position={[dx, -0.49, dz]}
                    rotation={[Math.PI / 2, 0, 0]}
                  >
                    <cylinderGeometry args={[0.12, 0.12, 0.055, 12]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.85} />
                  </mesh>
                ))
              )}
            </group>
          ))}
        </group>
      )}

      {/* Anti-Collision Red Beacon & White Tail Strobe */}
      <mesh position={[0.22, fuselageCenterY + spec.radius * (spec.doubleDeck ? 1.38 : 1.04), 0]}>
        <sphereGeometry args={[0.065, 10, 10]} />
        <meshStandardMaterial
          ref={beaconTopRef}
          color="#ef4444"
          emissive="#ff1e1e"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-spec.length * 0.5, fuselageCenterY + spec.radius * 0.65, 0]}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshStandardMaterial
          ref={strobeTailRef}
          color="#ffffff"
          emissive="#e0f2fe"
          emissiveIntensity={4}
          toneMapped={false}
        />
      </mesh>

      {/* Landing Lights & Volumetric Beam */}
      {landingLights && (
        <group position={[noseX * 0.92, spec.radius * 0.42, 0]}>
          <mesh>
            <sphereGeometry args={[0.085, 10, 10]} />
            <meshStandardMaterial
              color="#fef9c3"
              emissive="#fef08a"
              emissiveIntensity={4.5 * nightBoost}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[4.8, -0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[1.75, 9.5, 16, 1, true]} />
            <meshBasicMaterial
              color="#fef9c3"
              transparent
              opacity={lightingMode === 'night' ? 0.24 : lightingMode === 'sunset' ? 0.14 : 0.06}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};
