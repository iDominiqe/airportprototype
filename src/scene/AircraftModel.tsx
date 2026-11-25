import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AircraftVariant, AirlineLivery, LightingMode } from '../types/aviation';

interface AircraftModelProps {
  variant: AircraftVariant;
  livery?: AirlineLivery;
  gearDeploy?: number; // 1 = down, 0 = retracted
  thrustLevel?: number; // 0..1
  landingLights?: boolean;
  lightingMode?: LightingMode;
  showReverseThrust?: boolean;
  scale?: number;
}

const LIVERY_PALETTES: Record<
  AirlineLivery,
  { fuselage: string; belly: string; tail: string; accent: string; engine: string }
> = {
  nova: {
    fuselage: '#f8fafc',
    belly: '#0f2744',
    tail: '#0284c7',
    accent: '#38bdf8',
    engine: '#0ea5e9',
  },
  euro: {
    fuselage: '#f1f5f9',
    belly: '#1e293b',
    tail: '#1d4ed8',
    accent: '#facc15',
    engine: '#1e40af',
  },
  sky: {
    fuselage: '#ffffff',
    belly: '#334155',
    tail: '#e11d48',
    accent: '#fb7185',
    engine: '#be123c',
  },
  pacific: {
    fuselage: '#f8fafc',
    belly: '#0f172a',
    tail: '#0d9488',
    accent: '#2dd4bf',
    engine: '#0f766e',
  },
};

const VARIANT_SPECS: Record<
  AircraftVariant,
  {
    length: number;
    radius: number;
    wingspan: number;
    wingChord: number;
    sweep: number;
    engineRadius: number;
    engineZ: number;
    wingletType: 'raked' | 'scimitar' | 'sharklet' | 'curved';
    darkCockpitMask: boolean;
  }
> = {
  b787: {
    length: 7.4,
    radius: 0.44,
    wingspan: 4.1,
    wingChord: 1.55,
    sweep: 1.7,
    engineRadius: 0.25,
    engineZ: 1.48,
    wingletType: 'raked',
    darkCockpitMask: false,
  },
  a350: {
    length: 7.8,
    radius: 0.45,
    wingspan: 4.3,
    wingChord: 1.6,
    sweep: 1.75,
    engineRadius: 0.26,
    engineZ: 1.54,
    wingletType: 'curved',
    darkCockpitMask: true,
  },
  b737: {
    length: 5.5,
    radius: 0.32,
    wingspan: 3.0,
    wingChord: 1.15,
    sweep: 1.15,
    engineRadius: 0.17,
    engineZ: 1.04,
    wingletType: 'scimitar',
    darkCockpitMask: false,
  },
  a320: {
    length: 5.3,
    radius: 0.33,
    wingspan: 2.95,
    wingChord: 1.12,
    sweep: 1.1,
    engineRadius: 0.18,
    engineZ: 1.02,
    wingletType: 'sharklet',
    darkCockpitMask: true,
  },
};

export const AircraftModel: React.FC<AircraftModelProps> = ({
  variant,
  livery = 'nova',
  gearDeploy = 1,
  thrustLevel = 0.2,
  landingLights = false,
  lightingMode = 'day',
  showReverseThrust = false,
  scale = 1,
}) => {
  const spec = VARIANT_SPECS[variant];
  const palette = LIVERY_PALETTES[livery];

  const beaconTopRef = useRef<THREE.MeshStandardMaterial>(null);
  const strobeTailRef = useRef<THREE.MeshStandardMaterial>(null);
  const fanLeftRef = useRef<THREE.Mesh>(null);
  const fanRightRef = useRef<THREE.Mesh>(null);

  // Build swept wing BufferGeometry for crisp commercial aircraft silhouette
  const { wingGeoLeft, wingGeoRight, tailGeo, hStabGeoLeft, hStabGeoRight } = useMemo(() => {
    const createWing = (side: 1 | -1) => {
      const shape = new THREE.Shape();
      const rootLead = 0.7;
      const rootTrail = rootLead - spec.wingChord;
      const tipLead = rootLead - spec.sweep;
      const tipTrail = tipLead - spec.wingChord * 0.34;
      const span = spec.wingspan;

      shape.moveTo(rootLead, 0);
      shape.lineTo(tipLead, side * span);
      shape.lineTo(tipTrail, side * span);
      shape.lineTo(rootTrail, 0);
      shape.closePath();

      const extrude = new THREE.ExtrudeGeometry(shape, {
        depth: 0.09,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.02,
        bevelThickness: 0.02,
      });
      extrude.rotateX(-Math.PI / 2);
      return extrude;
    };

    const createTail = () => {
      const shape = new THREE.Shape();
      shape.moveTo(-spec.length * 0.28, 0);
      shape.lineTo(-spec.length * 0.46, 0);
      shape.lineTo(-spec.length * 0.54, spec.radius * 3.15);
      shape.lineTo(-spec.length * 0.43, spec.radius * 3.15);
      shape.closePath();
      const extrude = new THREE.ExtrudeGeometry(shape, {
        depth: 0.07,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.015,
        bevelThickness: 0.015,
      });
      extrude.translate(0, 0, -0.035);
      return extrude;
    };

    const createHStab = (side: 1 | -1) => {
      const shape = new THREE.Shape();
      const span = spec.wingspan * 0.36;
      const x0 = -spec.length * 0.36;
      shape.moveTo(x0, 0);
      shape.lineTo(x0 - 0.55, side * span);
      shape.lineTo(x0 - 0.9, side * span);
      shape.lineTo(x0 - 0.68, 0);
      shape.closePath();
      const extrude = new THREE.ExtrudeGeometry(shape, {
        depth: 0.05,
        bevelEnabled: false,
      });
      extrude.rotateX(-Math.PI / 2);
      return extrude;
    };

    return {
      wingGeoLeft: createWing(1),
      wingGeoRight: createWing(-1),
      tailGeo: createTail(),
      hStabGeoLeft: createHStab(1),
      hStabGeoRight: createHStab(-1),
    };
  }, [spec]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const beaconFlash = Math.sin(t * 5.2) > 0.72 ? 5.5 : 0.25;
    const strobeFlash = (t % 1.4) < 0.11 ? 7.5 : 0.15;

    if (beaconTopRef.current) {
      beaconTopRef.current.emissiveIntensity = beaconFlash;
    }
    if (strobeTailRef.current) {
      strobeTailRef.current.emissiveIntensity = strobeFlash;
    }
    const fanSpin = delta * (4 + thrustLevel * 28);
    if (fanLeftRef.current) fanLeftRef.current.rotation.x += fanSpin;
    if (fanRightRef.current) fanRightRef.current.rotation.x += fanSpin;
  });

  const bodyLen = spec.length * 0.64;
  const noseOffset = bodyLen * 0.5;
  const tailConeOffset = -bodyLen * 0.5;
  const nightBoost = lightingMode === 'night' ? 1.55 : lightingMode === 'sunset' ? 1.25 : 0.9;
  const clampedGear = Math.max(0, Math.min(1, gearDeploy));
  const gearYOffset = (1 - clampedGear) * 0.36;
  const gearScale = Math.max(0.01, clampedGear);
  const exhaustGlow = (0.3 + thrustLevel * 3.8) * nightBoost;
  const exhaustScale = 0.25 + thrustLevel * 1.15;

  return (
    <group scale={scale}>
      {/* Main Fuselage */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, spec.radius * 1.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[spec.radius, spec.radius, bodyLen, 24]} />
        <meshStandardMaterial color={palette.fuselage} metalness={0.25} roughness={0.28} />
      </mesh>

      {/* Belly Cheatline Stripe */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, spec.radius * 1.15, 0]}>
        <cylinderGeometry args={[spec.radius * 0.985, spec.radius * 0.985, bodyLen * 0.96, 20, 1, false, Math.PI * 0.35, Math.PI * 0.3]} />
        <meshStandardMaterial color={palette.belly} metalness={0.35} roughness={0.35} />
      </mesh>

      {/* Aerodynamic Nose Cone */}
      <mesh rotation={[0, 0, -Math.PI / 2]} position={[noseOffset + spec.radius * 1.15, spec.radius * 1.3, 0]} castShadow>
        <coneGeometry args={[spec.radius, spec.radius * 2.35, 24]} />
        <meshStandardMaterial color={palette.fuselage} metalness={0.25} roughness={0.25} />
      </mesh>

      {/* Cockpit Windshield Band */}
      <mesh position={[noseOffset + spec.radius * 0.42, spec.radius * 1.62, 0]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[spec.radius * 0.95, spec.radius * 0.34, spec.radius * 1.32]} />
        <meshStandardMaterial
          color={spec.darkCockpitMask ? '#020617' : '#0f172a'}
          metalness={0.85}
          roughness={0.1}
          emissive="#1e3a5f"
          emissiveIntensity={lightingMode === 'night' ? 0.85 : 0.2}
        />
      </mesh>

      {/* Illuminated Cabin Windows Strip (Left & Right) */}
      {[1, -1].map((side) => (
        <mesh
          key={`win-${side}`}
          position={[0.1, spec.radius * 1.48, side * (spec.radius * 0.99)]}
        >
          <boxGeometry args={[bodyLen * 0.86, spec.radius * 0.14, 0.02]} />
          <meshStandardMaterial
            color="#bae6fd"
            emissive="#fef3c7"
            emissiveIntensity={lightingMode === 'night' ? 2.2 : lightingMode === 'sunset' ? 1.4 : 0.35}
            roughness={0.15}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Tail Cone */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[tailConeOffset - spec.radius * 1.3, spec.radius * 1.42, 0]} castShadow>
        <coneGeometry args={[spec.radius, spec.radius * 2.65, 24]} />
        <meshStandardMaterial color={palette.fuselage} metalness={0.25} roughness={0.3} />
      </mesh>

      {/* Vertical Stabilizer (Tail Fin) */}
      <mesh geometry={tailGeo} position={[0, spec.radius * 1.45, 0]} castShadow>
        <meshStandardMaterial color={palette.tail} metalness={0.3} roughness={0.32} />
      </mesh>

      {/* Horizontal Stabilizers */}
      <mesh geometry={hStabGeoLeft} position={[0, spec.radius * 1.45, 0]} castShadow>
        <meshStandardMaterial color={palette.fuselage} metalness={0.35} roughness={0.3} />
      </mesh>
      <mesh geometry={hStabGeoRight} position={[0, spec.radius * 1.45, 0]} castShadow>
        <meshStandardMaterial color={palette.fuselage} metalness={0.35} roughness={0.3} />
      </mesh>

      {/* Main Swept Wings */}
      <group position={[0.12, spec.radius * 1.04, 0]}>
        <mesh geometry={wingGeoLeft} rotation={[0.04, 0, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#e2e8f0" metalness={0.42} roughness={0.3} />
        </mesh>
        <mesh geometry={wingGeoRight} rotation={[-0.04, 0, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#e2e8f0" metalness={0.42} roughness={0.3} />
        </mesh>

        {/* Winglets / Sharklets / Raked Tips */}
        {[1, -1].map((side) => {
          const tipX = 0.7 - spec.sweep - spec.wingChord * 0.16;
          const tipZ = side * spec.wingspan;
          const tipY = 0.17;
          if (spec.wingletType === 'raked') {
            return (
              <mesh
                key={`winglet-${side}`}
                position={[tipX - 0.18, tipY + 0.04, tipZ + side * 0.16]}
                rotation={[side * -0.15, side * -0.35, 0]}
              >
                <boxGeometry args={[0.38, 0.04, 0.42]} />
                <meshStandardMaterial color={palette.accent} metalness={0.45} roughness={0.28} />
              </mesh>
            );
          }
          return (
            <group key={`winglet-${side}`} position={[tipX, tipY, tipZ]}>
              <mesh rotation={[side * -0.24, 0, -0.25]} position={[-0.08, 0.22, side * 0.04]} castShadow>
                <boxGeometry args={[0.26, 0.44, 0.04]} />
                <meshStandardMaterial color={palette.tail} metalness={0.35} roughness={0.3} />
              </mesh>
              {spec.wingletType === 'scimitar' && (
                <mesh rotation={[side * 0.3, 0, -0.25]} position={[-0.06, -0.14, side * 0.03]}>
                  <boxGeometry args={[0.18, 0.24, 0.035]} />
                  <meshStandardMaterial color={palette.accent} metalness={0.4} roughness={0.3} />
                </mesh>
              )}
            </group>
          );
        })}

        {/* Wingtip Navigation Lights (Red Port -Z, Green Starboard +Z) */}
        <mesh position={[0.7 - spec.sweep - 0.12, 0.18, -spec.wingspan]}>
          <sphereGeometry args={[0.065, 10, 10]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#ff2a2a"
            emissiveIntensity={2.8 * nightBoost}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0.7 - spec.sweep - 0.12, 0.18, spec.wingspan]}>
          <sphereGeometry args={[0.065, 10, 10]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22ff66"
            emissiveIntensity={2.8 * nightBoost}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Underwing Turbofan Engines */}
      {[-1, 1].map((side) => (
        <group key={`eng-${side}`} position={[0.35, spec.radius * 0.72, side * spec.engineZ]}>
          {/* Pylon */}
          <mesh position={[-0.1, spec.engineRadius * 0.85, 0]}>
            <boxGeometry args={[0.55, 0.22, 0.09]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.35} />
          </mesh>
          {/* Nacelle Cowling */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[spec.engineRadius, spec.engineRadius * 0.9, 0.92, 20]} />
            <meshStandardMaterial color={palette.engine} metalness={0.4} roughness={0.28} />
          </mesh>
          {/* Chrome Intake Lip */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0.46, 0, 0]}>
            <torusGeometry args={[spec.engineRadius * 0.96, 0.032, 10, 22]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.12} />
          </mesh>
          {/* Spinning Fan Disk */}
          <mesh
            ref={side === -1 ? fanLeftRef : fanRightRef}
            rotation={[0, 0, Math.PI / 2]}
            position={[0.41, 0, 0]}
          >
            <cylinderGeometry args={[spec.engineRadius * 0.85, spec.engineRadius * 0.85, 0.04, 12]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.35} />
          </mesh>
          {/* Glowing Exhaust Core & Thrust Plume */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.47, 0, 0]}>
            <cylinderGeometry args={[spec.engineRadius * 0.55, spec.engineRadius * 0.7, 0.14, 16]} />
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
              position={[-0.58 - exhaustScale * 0.45, 0, 0]}
            >
              <coneGeometry args={[spec.engineRadius * 0.62, exhaustScale * 1.15, 16]} />
              <meshBasicMaterial
                color={thrustLevel > 0.78 ? '#60a5fa' : '#fb923c'}
                transparent
                opacity={Math.min(0.62, thrustLevel * 0.55)}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          )}
          {/* Reverse Thrust Spoiler Glow on Landing */}
          {showReverseThrust && (
            <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[spec.engineRadius * 1.12, spec.engineRadius * 1.12, 0.22, 14]} />
              <meshBasicMaterial color="#fdba74" transparent opacity={0.42} />
            </mesh>
          )}
        </group>
      ))}

      {/* Retractable Landing Gear */}
      {clampedGear > 0.04 && (
        <group position={[0, gearYOffset, 0]} scale={[1, gearScale, 1]}>
          {/* Nose Gear */}
          <group position={[noseOffset * 0.82, spec.radius * 0.5, 0]}>
            <mesh position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.032, 0.032, 0.48, 8]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.25} />
            </mesh>
            <mesh position={[0, -0.44, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.095, 0.095, 0.05, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.44, -0.045]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.095, 0.095, 0.05, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
          </group>

          {/* Main Left & Right Gear Bogies */}
          {[-1, 1].map((side) => (
            <group key={`gear-${side}`} position={[-0.12, spec.radius * 0.5, side * (spec.radius * 1.35)]}>
              <mesh position={[0, -0.24, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.52, 8]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.25} />
              </mesh>
              {[-0.08, 0.08].map((dx) =>
                [-0.06, 0.06].map((dz) => (
                  <mesh
                    key={`wheel-${dx}-${dz}`}
                    position={[dx, -0.45, dz]}
                    rotation={[Math.PI / 2, 0, 0]}
                  >
                    <cylinderGeometry args={[0.115, 0.115, 0.055, 12]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.85} />
                  </mesh>
                ))
              )}
            </group>
          ))}
        </group>
      )}

      {/* Anti-collision Red Beacon + Tail White Strobe */}
      <mesh position={[0.15, spec.radius * 2.38, 0]}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshStandardMaterial
          ref={beaconTopRef}
          color="#ef4444"
          emissive="#ff1e1e"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-spec.length * 0.5, spec.radius * 1.5, 0]}>
        <sphereGeometry args={[0.055, 10, 10]} />
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
        <group position={[noseOffset + spec.radius * 0.4, spec.radius * 0.4, 0]}>
          <mesh>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial
              color="#fef9c3"
              emissive="#fef08a"
              emissiveIntensity={4.5 * nightBoost}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[4.5, -0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[1.65, 9, 16, 1, true]} />
            <meshBasicMaterial
              color="#fef9c3"
              transparent
              opacity={lightingMode === 'night' ? 0.22 : lightingMode === 'sunset' ? 0.14 : 0.05}
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
