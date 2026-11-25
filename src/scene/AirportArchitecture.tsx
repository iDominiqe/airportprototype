import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LightingMode, TakeoffPhase } from '../types/aviation';
import {
  APRON_TAXI_Z,
  GATE_COORDS,
  HIGH_SPEED_EXIT_X,
  RUNWAY_LEFT_Z,
  RUNWAY_LENGTH,
  RUNWAY_RIGHT_Z,
  RUNWAY_WIDTH,
  WEST_ENTRY_X,
} from './airportLayout';
import { getApronTexture, getRunwayTexture, getTerminalSignTexture } from './textures';
import { AircraftModel } from './AircraftModel';

interface AirportArchitectureProps {
  lightingMode: LightingMode;
  takeoffPhase: TakeoffPhase;
}

const TAXI_CONNECTOR_XS = [WEST_ENTRY_X, -36, 0, HIGH_SPEED_EXIT_X, 76];

export const AirportArchitecture: React.FC<AirportArchitectureProps> = ({
  lightingMode,
  takeoffPhase,
}) => {
  const radarRef = useRef<THREE.Group>(null);
  const g3BridgeRef = useRef<THREE.Group>(null);
  const blueEdgeRef = useRef<THREE.InstancedMesh>(null);
  const greenCenterRef = useRef<THREE.InstancedMesh>(null);
  const runwayEdgeRef = useRef<THREE.InstancedMesh>(null);
  const approachRabbitRef = useRef<THREE.InstancedMesh>(null);

  const runwayLeftTex = useMemo(() => getRunwayTexture('left'), []);
  const runwayRightTex = useMemo(() => getRunwayTexture('right'), []);
  const apronTex = useMemo(() => getApronTexture(), []);
  const signTex = useMemo(() => getTerminalSignTexture(), []);

  const lightMult = lightingMode === 'night' ? 4.2 : lightingMode === 'sunset' ? 2.5 : 0.85;
  const interiorEmissive = lightingMode === 'night' ? 2.1 : lightingMode === 'sunset' ? 1.45 : 0.45;

  // Compute instanced coordinates for taxiway blue edge, green centerline, and runway edge lights
  const { blueEdgePositions, greenCenterPositions, runwayEdgePositions, approachPositions } =
    useMemo(() => {
      const blue: THREE.Vector3[] = [];
      const green: THREE.Vector3[] = [];
      const rwyEdge: THREE.Vector3[] = [];
      const approach: THREE.Vector3[] = [];

      // Apron taxiway edge & centerline lights
      for (let x = -80; x <= 80; x += 6) {
        blue.push(new THREE.Vector3(x, 0.14, APRON_TAXI_Z - 2.4));
        blue.push(new THREE.Vector3(x, 0.14, APRON_TAXI_Z + 2.4));
        green.push(new THREE.Vector3(x, 0.08, APRON_TAXI_Z));
      }

      // Connector taxiways lights
      for (const cx of TAXI_CONNECTOR_XS) {
        for (let z = APRON_TAXI_Z + 3; z <= RUNWAY_RIGHT_Z - 5; z += 4.5) {
          if (Math.abs(z - RUNWAY_LEFT_Z) < 5.2) continue;
          blue.push(new THREE.Vector3(cx - 2.1, 0.14, z));
          blue.push(new THREE.Vector3(cx + 2.1, 0.14, z));
          green.push(new THREE.Vector3(cx, 0.08, z));
        }
      }

      // Runway white edge lights along both runways
      for (const rz of [RUNWAY_LEFT_Z, RUNWAY_RIGHT_Z]) {
        for (let x = -RUNWAY_LENGTH / 2 + 4; x <= RUNWAY_LENGTH / 2 - 4; x += 7) {
          rwyEdge.push(new THREE.Vector3(x, 0.15, rz - RUNWAY_WIDTH / 2 - 0.4));
          rwyEdge.push(new THREE.Vector3(x, 0.15, rz + RUNWAY_WIDTH / 2 + 0.4));
        }
        // Approach lighting system west of threshold
        for (let i = 1; i <= 10; i++) {
          const ax = -RUNWAY_LENGTH / 2 - i * 5.2;
          approach.push(new THREE.Vector3(ax, 0.25, rz));
          if (i % 2 === 0) {
            approach.push(new THREE.Vector3(ax, 0.25, rz - 2.4));
            approach.push(new THREE.Vector3(ax, 0.25, rz + 2.4));
          }
        }
      }

      return {
        blueEdgePositions: blue,
        greenCenterPositions: green,
        runwayEdgePositions: rwyEdge,
        approachPositions: approach,
      };
    }, []);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const populate = (mesh: THREE.InstancedMesh | null, pts: THREE.Vector3[]) => {
      if (!mesh) return;
      pts.forEach((p, idx) => {
        dummy.position.copy(p);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };

    populate(blueEdgeRef.current, blueEdgePositions);
    populate(greenCenterRef.current, greenCenterPositions);
    populate(runwayEdgeRef.current, runwayEdgePositions);
    populate(approachRabbitRef.current, approachPositions);
  }, [blueEdgePositions, greenCenterPositions, runwayEdgePositions, approachPositions]);

  // Animate ATC radar & sequential approach strobe lights + G3 jet bridge retraction
  useFrame((state, delta) => {
    if (radarRef.current) {
      radarRef.current.rotation.y += delta * 1.45;
    }

    if (g3BridgeRef.current) {
      const targetZ = takeoffPhase === 'idle' ? 0 : -1.9;
      g3BridgeRef.current.position.z = THREE.MathUtils.lerp(
        g3BridgeRef.current.position.z,
        targetZ,
        delta * 3
      );
    }

    if (approachRabbitRef.current) {
      const mat = approachRabbitRef.current.material as THREE.MeshStandardMaterial;
      const pulse = 0.65 + 0.35 * Math.sin(state.clock.elapsedTime * 7);
      mat.emissiveIntensity = (lightingMode === 'night' ? 4.8 : lightingMode === 'sunset' ? 3.2 : 1.4) * pulse;
    }
  });

  const groundColor =
    lightingMode === 'night' ? '#0c1622' : lightingMode === 'sunset' ? '#1e2c2b' : '#2b4436';
  const asphaltColor = '#1b222c';

  return (
    <group>
      {/* Expansive Airfield Terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[560, 560]} />
        <meshStandardMaterial color={groundColor} roughness={0.95} metalness={0.02} />
      </mesh>

      {/* Apron Concrete Slab */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -15.5]} receiveShadow>
        <planeGeometry args={[102, 22]} />
        <meshStandardMaterial map={apronTex} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Apron Main Taxiway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, APRON_TAXI_Z]} receiveShadow>
        <planeGeometry args={[168, 5.2]} />
        <meshStandardMaterial color={asphaltColor} roughness={0.88} />
      </mesh>
      {/* Apron Taxiway Yellow Centerline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, APRON_TAXI_Z]}>
        <planeGeometry args={[164, 0.22]} />
        <meshStandardMaterial color="#facc15" roughness={0.5} />
      </mesh>

      {/* Connector Taxiways */}
      {TAXI_CONNECTOR_XS.map((cx) => (
        <group key={`conn-${cx}`} position={[cx, 0, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 13.2]} receiveShadow>
            <planeGeometry args={[4.4, 42]} />
            <meshStandardMaterial color={asphaltColor} roughness={0.88} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.021, 13.2]}>
            <planeGeometry args={[0.2, 40]} />
            <meshStandardMaterial color="#facc15" roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* LEFT RUNWAY: 08L / 26R (Arrivals) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, RUNWAY_LEFT_Z]} receiveShadow>
        <planeGeometry args={[RUNWAY_LENGTH, RUNWAY_WIDTH]} />
        <meshStandardMaterial map={runwayLeftTex} roughness={0.82} metalness={0.06} />
      </mesh>

      {/* RIGHT RUNWAY: 08R / 26L (Departures) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, RUNWAY_RIGHT_Z]} receiveShadow>
        <planeGeometry args={[RUNWAY_LENGTH, RUNWAY_WIDTH]} />
        <meshStandardMaterial map={runwayRightTex} roughness={0.82} metalness={0.06} />
      </mesh>

      {/* PAPI 4-Light Indicators beside both 08L & 08R thresholds */}
      {[RUNWAY_LEFT_Z, RUNWAY_RIGHT_Z].map((rz) => (
        <group key={`papi-${rz}`} position={[-RUNWAY_LENGTH / 2 + 18, 0.25, rz + RUNWAY_WIDTH / 2 + 2.2]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={`papi-lamp-${i}`} position={[0, 0, i * 0.9]}>
              <boxGeometry args={[0.45, 0.26, 0.45]} />
              <meshStandardMaterial
                color={i < 2 ? '#ef4444' : '#ffffff'}
                emissive={i < 2 ? '#ff2424' : '#ffffff'}
                emissiveIntensity={2.8 * lightMult}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Threshold Green & Runway-End Red Lights */}
      {[RUNWAY_LEFT_Z, RUNWAY_RIGHT_Z].map((rz) => (
        <group key={`thr-${rz}`}>
          {[-4, -2, 0, 2, 4].map((dz) => (
            <React.Fragment key={`thr-pt-${dz}`}>
              <mesh position={[-RUNWAY_LENGTH / 2 + 0.6, 0.14, rz + dz]}>
                <sphereGeometry args={[0.16, 8, 8]} />
                <meshStandardMaterial
                  color="#22c55e"
                  emissive="#22ff66"
                  emissiveIntensity={2.5 * lightMult}
                  toneMapped={false}
                />
              </mesh>
              <mesh position={[RUNWAY_LENGTH / 2 - 0.6, 0.14, rz + dz]}>
                <sphereGeometry args={[0.16, 8, 8]} />
                <meshStandardMaterial
                  color="#ef4444"
                  emissive="#ff2424"
                  emissiveIntensity={2.5 * lightMult}
                  toneMapped={false}
                />
              </mesh>
            </React.Fragment>
          ))}
        </group>
      ))}

      {/* Instanced Taxiway & Runway Lighting */}
      <instancedMesh ref={blueEdgeRef} args={[undefined, undefined, blueEdgePositions.length]}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={1.6 * lightMult}
          toneMapped={false}
        />
      </instancedMesh>

      <instancedMesh ref={greenCenterRef} args={[undefined, undefined, greenCenterPositions.length]}>
        <sphereGeometry args={[0.11, 8, 8]} />
        <meshStandardMaterial
          color="#4ade80"
          emissive="#22c55e"
          emissiveIntensity={1.5 * lightMult}
          toneMapped={false}
        />
      </instancedMesh>

      <instancedMesh ref={runwayEdgeRef} args={[undefined, undefined, runwayEdgePositions.length]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#fef3c7"
          emissiveIntensity={1.8 * lightMult}
          toneMapped={false}
        />
      </instancedMesh>

      <instancedMesh ref={approachRabbitRef} args={[undefined, undefined, approachPositions.length]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#bae6fd"
          emissiveIntensity={2.5 * lightMult}
          toneMapped={false}
        />
      </instancedMesh>

      {/* CURVED ARCHITECTURAL AIRPORT TERMINAL */}
      <group position={[0, 0, -29.5]}>
        {/* Concrete Terminal Plinth */}
        <mesh position={[0, 0.4, 0]} receiveShadow castShadow>
          <boxGeometry args={[94, 0.8, 13.5]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>

        {/* Illuminated Interior Concourse Core */}
        <mesh position={[0, 2.7, 0]}>
          <boxGeometry args={[86, 4.0, 9.6]} />
          <meshStandardMaterial
            color="#e2e8f0"
            emissive="#fef3c7"
            emissiveIntensity={interiorEmissive}
            roughness={0.45}
          />
        </mesh>

        {/* Curved Glass Curtain Wall */}
        <mesh position={[0, 2.85, 0.4]} castShadow>
          <boxGeometry args={[89, 4.4, 11.2]} />
          <meshPhysicalMaterial
            color="#bae6fd"
            transparent
            opacity={lightingMode === 'night' ? 0.42 : 0.56}
            roughness={0.08}
            metalness={0.25}
            reflectivity={0.95}
          />
        </mesh>

        {/* Exterior Architectural Glass Mullions / Columns */}
        {Array.from({ length: 13 }).map((_, i) => {
          const x = -42 + i * 7;
          return (
            <mesh key={`col-${i}`} position={[x, 2.9, 6.05]} castShadow>
              <boxGeometry args={[0.35, 4.8, 0.35]} />
              <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.25} />
            </mesh>
          );
        })}

        {/* Sculptural Sweeping Curved Wave Roof (oriented horizontally along X) */}
        <mesh position={[0, 5.2, 0.2]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1.35]} castShadow receiveShadow>
          <cylinderGeometry args={[6.2, 6.2, 92, 24, 1, false, -Math.PI * 0.36, Math.PI * 0.72]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.34} />
        </mesh>
        <mesh position={[0, 5.45, 0.2]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1.2]}>
          <cylinderGeometry args={[6.35, 6.35, 86, 20, 1, false, -Math.PI * 0.18, Math.PI * 0.36]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.62} roughness={0.28} />
        </mesh>

        {/* Illuminated Roof Sign: CHIȘINĂU INTERNATIONAL · RMO (Mounted above curved roof crest) */}
        <group position={[0, 12.2, 2.8]}>
          <mesh position={[-10, -1.2, -0.1]}>
            <boxGeometry args={[0.45, 2.0, 0.45]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[10, -1.2, -0.1]}>
            <boxGeometry args={[0.45, 2.0, 0.45]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh>
            <boxGeometry args={[29, 2.35, 0.45]} />
            <meshStandardMaterial color="#0b1526" metalness={0.65} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.26]}>
            <planeGeometry args={[28.2, 2.05]} />
            <meshStandardMaterial
              map={signTex}
              emissiveMap={signTex}
              emissive="#ffffff"
              emissiveIntensity={lightingMode === 'night' ? 2.1 : 1.15}
              toneMapped={false}
            />
          </mesh>
        </group>

        {/* Landside Drop-Off Canopy & Terminal Access Road */}
        <mesh position={[0, 2.4, -7.8]} castShadow>
          <boxGeometry args={[76, 0.35, 4.4]} />
          <meshStandardMaterial color="#475569" metalness={0.65} roughness={0.3} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -13]}>
          <planeGeometry args={[112, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
      </group>

      {/* 6 ILLUMINATED BOARDING GATES & TELESCOPIC JET BRIDGES */}
      {Object.entries(GATE_COORDS).map(([gate, pos]) => {
        const isHeroGate = gate === 'G3';
        return (
          <group key={gate} position={[pos.x, 0, -22.2]}>
            {/* Terminal Gate Rotunda */}
            <mesh position={[0, 2.4, 0]} castShadow>
              <cylinderGeometry args={[0.85, 0.85, 4.4, 14]} />
              <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Illuminated Gate Sign */}
            <mesh position={[0, 4.35, 0.9]}>
              <boxGeometry args={[1.9, 0.72, 0.2]} />
              <meshStandardMaterial
                color="#0284c7"
                emissive="#38bdf8"
                emissiveIntensity={1.6 * Math.max(0.7, lightMult * 0.45)}
                toneMapped={false}
              />
            </mesh>
            {/* Telescopic Jet Bridge */}
            <group ref={isHeroGate ? g3BridgeRef : undefined}>
              <mesh position={[0, 2.35, 2.7]} castShadow>
                <boxGeometry args={[1.05, 1.15, 4.8]} />
                <meshPhysicalMaterial
                  color="#bae6fd"
                  transparent
                  opacity={0.78}
                  roughness={0.18}
                  metalness={0.35}
                />
              </mesh>
              {/* Support Stilt */}
              <mesh position={[0, 1.1, 4.2]}>
                <cylinderGeometry args={[0.14, 0.18, 2.2, 8]} />
                <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.35} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* Apron Floodlight Masts */}
      {[-38, -14, 14, 38].map((mx) => (
        <group key={`mast-${mx}`} position={[mx, 0, -21.8]}>
          <mesh position={[0, 4.5, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 9, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.75} roughness={0.3} />
          </mesh>
          <mesh position={[0, 9.1, 0.3]}>
            <boxGeometry args={[1.4, 0.35, 0.5]} />
            <meshStandardMaterial
              color="#fffbeb"
              emissive="#fef08a"
              emissiveIntensity={lightingMode === 'night' ? 4.2 : lightingMode === 'sunset' ? 2.6 : 0.4}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* AIR TRAFFIC CONTROL (ATC) TOWER */}
      <group position={[-48, 0, -16]}>
        {/* Base Podium */}
        <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[3.4, 4.0, 2.8, 12]} />
          <meshStandardMaterial color="#334155" metalness={0.45} roughness={0.5} />
        </mesh>
        {/* Sculpted Tapered Shaft */}
        <mesh position={[0, 9.2, 0]} castShadow>
          <cylinderGeometry args={[1.75, 2.55, 13.5, 16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.28} roughness={0.35} />
        </mesh>
        {/* Flared Observation Cab Support */}
        <mesh position={[0, 16.4, 0]} castShadow>
          <cylinderGeometry args={[3.4, 1.8, 1.8, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.65} roughness={0.3} />
        </mesh>
        {/* Octagonal Tinted ATC Glass Cab */}
        <mesh position={[0, 18.2, 0]}>
          <cylinderGeometry args={[3.7, 3.25, 2.2, 10]} />
          <meshPhysicalMaterial
            color="#38bdf8"
            transparent
            opacity={0.65}
            roughness={0.08}
            metalness={0.3}
          />
        </mesh>
        {/* Glowing ATC Radar Consoles Inside */}
        <mesh position={[0, 17.9, 0]}>
          <cylinderGeometry args={[2.3, 2.3, 1.0, 10]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive="#22d3ee"
            emissiveIntensity={lightingMode === 'night' ? 2.4 : 1.2}
            toneMapped={false}
          />
        </mesh>
        {/* Control Tower Roof */}
        <mesh position={[0, 19.6, 0]} castShadow>
          <cylinderGeometry args={[2.5, 3.85, 0.8, 10]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.55} roughness={0.25} />
        </mesh>
        {/* Aviation Red Obstruction Beacons */}
        {[0, Math.PI].map((ang, idx) => (
          <mesh key={`obs-${idx}`} position={[Math.cos(ang) * 3.5, 19.65, Math.sin(ang) * 3.5]}>
            <sphereGeometry args={[0.18, 10, 10]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#ff1e1e"
              emissiveIntensity={3.5 * Math.max(0.7, lightMult * 0.6)}
              toneMapped={false}
            />
          </mesh>
        ))}
        {/* Rotating Rooftop ATC Radar Scanner */}
        <group ref={radarRef} position={[0, 20.6, 0]}>
          <mesh>
            <cylinderGeometry args={[0.25, 0.35, 1.1, 10]} />
            <meshStandardMaterial color="#64748b" metalness={0.75} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[3.1, 0.48, 0.28]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[2.9, 0.14, 0.32]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#38bdf8"
              emissiveIntensity={2.0}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>

      {/* Stylized Architectural Pine & Landscaping Trees around Terminal Plaza */}
      {[
        [-52, -38], [-44, -40], [-32, -41], [-18, -42], [18, -42], [32, -41], [44, -40], [54, -36],
        [-64, -28], [-66, -15], [56, -28], [60, -18],
      ].map(([tx, tz], idx) => (
        <group key={`tree-${idx}`} position={[tx, 0, tz]} scale={0.85 + (idx % 3) * 0.18}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.25, 1.8, 7]} />
            <meshStandardMaterial color="#5c4033" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.5, 0]} castShadow>
            <coneGeometry args={[1.35, 2.8, 8]} />
            <meshStandardMaterial
              color={idx % 2 === 0 ? '#15803d' : '#166534'}
              roughness={0.85}
            />
          </mesh>
          <mesh position={[0, 3.8, 0]} castShadow>
            <coneGeometry args={[0.95, 2.1, 8]} />
            <meshStandardMaterial color="#22c55e" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Parked Ambient Commercial Airliners at Gates G1, G5, G6 */}
      <group position={[GATE_COORDS.G1.x, 0, GATE_COORDS.G1.z]} rotation={[0, Math.PI / 2, 0]}>
        <AircraftModel variant="b737" livery="euro" thrustLevel={0.05} lightingMode={lightingMode} />
      </group>
      <group position={[GATE_COORDS.G5.x, 0, GATE_COORDS.G5.z]} rotation={[0, Math.PI / 2, 0]}>
        <AircraftModel variant="a320" livery="sky" thrustLevel={0.05} lightingMode={lightingMode} />
      </group>
      <group position={[GATE_COORDS.G6.x, 0, GATE_COORDS.G6.z]} rotation={[0, Math.PI / 2, 0]}>
        <AircraftModel variant="a350" livery="pacific" thrustLevel={0.05} lightingMode={lightingMode} />
      </group>
    </group>
  );
};
