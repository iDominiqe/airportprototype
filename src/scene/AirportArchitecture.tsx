import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphicsQuality, LightingMode, TakeoffPhase } from '../types/aviation';
import {
  APRON_TAXI_Z,
  EAST_EXIT_X,
  EAST_TAXI_X,
  GATE_COORDS,
  NORTH_TAXI_Z,
  RUNWAY_EAST_LENGTH,
  RUNWAY_EAST_X,
  RUNWAY_LENGTH,
  RUNWAY_NORTH_LENGTH,
  RUNWAY_NORTH_Z,
  RUNWAY_SOUTH_ARR_Z,
  RUNWAY_SOUTH_DEP_Z,
  RUNWAY_WIDTH,
  WEST_ENTRY_X,
} from './airportLayout';
import { getApronTexture, getRunwayTexture, getTerminalSignTexture } from './textures';
import { AircraftModel } from './AircraftModel';

interface AirportArchitectureProps {
  lightingMode: LightingMode;
  quality: GraphicsQuality;
  takeoffPhase: TakeoffPhase;
}

const PAVILION_COORDS: Array<[number, number, number]> = [
  [-42, -26, 0.25],
  [42, -26, -0.25],
  [-30, -52, -0.45],
  [30, -52, 0.45],
];

const WIND_TURBINE_COORDS: Array<[number, number]> = [
  [-12, -32],
  [12, -32],
  [0, -44],
  [-84, -46],
];

export const AirportArchitecture: React.FC<AirportArchitectureProps> = ({
  lightingMode,
  quality,
  takeoffPhase,
}) => {
  const isClay = quality === 'clay';
  const radarRef = useRef<THREE.Group>(null);
  const g3BridgeRef = useRef<THREE.Group>(null);
  const turbineRefs = useRef<Array<THREE.Group | null>>([]);
  const blueEdgeRef = useRef<THREE.InstancedMesh>(null);
  const greenCenterRef = useRef<THREE.InstancedMesh>(null);
  const runwayEdgeRef = useRef<THREE.InstancedMesh>(null);
  const approachRabbitRef = useRef<THREE.InstancedMesh>(null);

  const rwySouthArrTex = useMemo(() => getRunwayTexture('08L', '26R', isClay), [isClay]);
  const rwySouthDepTex = useMemo(() => getRunwayTexture('08R', '26L', isClay), [isClay]);
  const rwyNorthTex = useMemo(() => getRunwayTexture('09L', '27R', isClay), [isClay]);
  const rwyEastTex = useMemo(() => getRunwayTexture('17', '35', isClay), [isClay]);
  const apronTex = useMemo(() => getApronTexture(), []);
  const signTex = useMemo(() => getTerminalSignTexture(), []);

  const lightMult = isClay
    ? 0.45
    : lightingMode === 'night'
      ? 4.2
      : lightingMode === 'sunset'
        ? 2.4
        : 0.85;
  const interiorEmissive = isClay
    ? 0.15
    : lightingMode === 'night'
      ? 2.0
      : lightingMode === 'sunset'
        ? 1.35
        : 0.4;

  // Instanced taxiway & multi-runway lighting across all 4 runways
  const { blueEdgePositions, greenCenterPositions, runwayEdgePositions, approachPositions } =
    useMemo(() => {
      const blue: THREE.Vector3[] = [];
      const green: THREE.Vector3[] = [];
      const rwyEdge: THREE.Vector3[] = [];
      const approach: THREE.Vector3[] = [];

      // South Apron Taxiway lights (x in [-94, 112], skipping connector junctions)
      for (let x = -90; x <= 108; x += 7) {
        const nearSouthConn =
          Math.abs(x - WEST_ENTRY_X) < 4 ||
          Math.abs(x - 0) < 4 ||
          Math.abs(x - EAST_EXIT_X) < 4 ||
          Math.abs(x - 92) < 4;
        if (!nearSouthConn) {
          blue.push(new THREE.Vector3(x, 0.14, APRON_TAXI_Z + 2.4));
        }
        blue.push(new THREE.Vector3(x, 0.14, APRON_TAXI_Z - 2.4));
        green.push(new THREE.Vector3(x, 0.08, APRON_TAXI_Z));
      }

      // North Perimeter Taxiway lights (x in [-92, 112], skipping connector junctions)
      for (let x = -90; x <= 108; x += 8) {
        const nearNorthConn =
          Math.abs(x - WEST_ENTRY_X) < 4 ||
          Math.abs(x + 62) < 4 ||
          Math.abs(x - 84) < 4;
        if (!nearNorthConn) {
          blue.push(new THREE.Vector3(x, 0.14, NORTH_TAXI_Z - 2.3));
        }
        blue.push(new THREE.Vector3(x, 0.14, NORTH_TAXI_Z + 2.3));
        green.push(new THREE.Vector3(x, 0.08, NORTH_TAXI_Z));
      }

      // East Perimeter Taxiway lights (z in [-66, 64], skipping feeder junctions)
      for (let z = -62; z <= 60; z += 8) {
        const nearFeeder =
          Math.abs(z - NORTH_TAXI_Z) < 4 ||
          Math.abs(z - APRON_TAXI_Z) < 4 ||
          Math.abs(z - RUNWAY_SOUTH_DEP_Z) < 4;
        if (!nearFeeder) {
          blue.push(new THREE.Vector3(EAST_TAXI_X + 2.3, 0.14, z));
        }
        blue.push(new THREE.Vector3(EAST_TAXI_X - 2.3, 0.14, z));
        green.push(new THREE.Vector3(EAST_TAXI_X, 0.08, z));
      }

      // South East-West Runways (08L & 08R)
      for (const rz of [RUNWAY_SOUTH_ARR_Z, RUNWAY_SOUTH_DEP_Z]) {
        for (let x = -RUNWAY_LENGTH / 2 + 6; x <= RUNWAY_LENGTH / 2 - 6; x += 8) {
          rwyEdge.push(new THREE.Vector3(x, 0.15, rz - RUNWAY_WIDTH / 2 - 0.4));
          rwyEdge.push(new THREE.Vector3(x, 0.15, rz + RUNWAY_WIDTH / 2 + 0.4));
        }
        for (let i = 1; i <= 8; i++) {
          const ax = -RUNWAY_LENGTH / 2 - i * 5.2;
          approach.push(new THREE.Vector3(ax, 0.25, rz));
        }
      }

      // North Runway (09L / 27R)
      for (let x = -RUNWAY_NORTH_LENGTH / 2 + 6; x <= RUNWAY_NORTH_LENGTH / 2 - 6; x += 8) {
        rwyEdge.push(new THREE.Vector3(x, 0.15, RUNWAY_NORTH_Z - 5.2));
        rwyEdge.push(new THREE.Vector3(x, 0.15, RUNWAY_NORTH_Z + 5.2));
      }
      for (let i = 1; i <= 8; i++) {
        approach.push(new THREE.Vector3(RUNWAY_NORTH_LENGTH / 2 + i * 5.2, 0.25, RUNWAY_NORTH_Z));
      }

      // East Crosswind Runway (17 / 35)
      for (let z = -84; z <= 70; z += 8) {
        rwyEdge.push(new THREE.Vector3(RUNWAY_EAST_X - 5.2, 0.15, z));
        rwyEdge.push(new THREE.Vector3(RUNWAY_EAST_X + 5.2, 0.15, z));
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

  useFrame((state, delta) => {
    if (radarRef.current) {
      radarRef.current.rotation.y += delta * 1.4;
    }
    for (const turb of turbineRefs.current) {
      if (turb) turb.rotation.z -= delta * 1.5;
    }
    if (g3BridgeRef.current) {
      const targetZ = takeoffPhase === 'idle' ? 0 : -1.9;
      g3BridgeRef.current.position.z = THREE.MathUtils.lerp(
        g3BridgeRef.current.position.z,
        targetZ,
        delta * 3
      );
    }
    if (approachRabbitRef.current && !isClay) {
      const mat = approachRabbitRef.current.material as THREE.MeshStandardMaterial;
      const pulse = 0.65 + 0.35 * Math.sin(state.clock.elapsedTime * 7);
      mat.emissiveIntensity =
        (lightingMode === 'night' ? 4.8 : lightingMode === 'sunset' ? 3.0 : 1.3) * pulse;
    }
  });

  const groundColor = isClay
    ? lightingMode === 'night'
      ? '#1d2738'
      : '#dbe5dc'
    : lightingMode === 'night'
      ? '#0d1722'
      : lightingMode === 'sunset'
        ? '#263331'
        : '#3c5a4b';

  const plinthColor = isClay
    ? '#f1f5f9'
    : lightingMode === 'night'
      ? '#1e293b'
      : '#e2e8f0';

  const taxiSurfaceColor = isClay ? '#b8c3cf' : '#1b222c';
  const shellWhite = isClay ? '#ffffff' : '#f1f5f9';
  const accentRib = isClay ? '#cbd5e1' : '#94a3b8';

  return (
    <group>
      {/* Distant Ambient Horizon Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial
          color={isClay ? (lightingMode === 'night' ? '#0b1220' : '#e6ebf0') : lightingMode === 'night' ? '#070e19' : '#253831'}
          roughness={0.95}
        />
      </mesh>

      {/* Architectural Exhibition Maquette Table Plinth */}
      <group position={[12, 0, -8]}>
        <mesh position={[0, -1.2, 0]} receiveShadow={!isClay}>
          <boxGeometry args={[320, 2.2, 210]} />
          <meshStandardMaterial color={plinthColor} roughness={0.65} metalness={isClay ? 0.05 : 0.2} />
        </mesh>
        {/* Top Airfield Landscape Deck */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow={!isClay}>
          <planeGeometry args={[312, 202]} />
          <meshStandardMaterial color={groundColor} roughness={0.92} metalness={0.02} />
        </mesh>
        {/* Frosted Exhibition Showcase Rim */}
        <mesh position={[0, 0.45, 104]}>
          <boxGeometry args={[320, 1.2, 0.35]} />
          <meshStandardMaterial color="#bae6fd" transparent opacity={0.35} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.45, -104]}>
          <boxGeometry args={[320, 1.2, 0.35]} />
          <meshStandardMaterial color="#bae6fd" transparent opacity={0.35} roughness={0.2} />
        </mesh>
      </group>

      {/* SOUTH APRON CONCRETE SLAB */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 7.5]} receiveShadow={!isClay}>
        <planeGeometry args={[112, 22]} />
        {isClay ? (
          <meshStandardMaterial color="#d4dde7" roughness={0.85} />
        ) : (
          <meshStandardMaterial map={apronTex} roughness={0.85} metalness={0.05} />
        )}
      </mesh>

      {/* TAXIWAY NETWORK (South Apron, North Perimeter, East Perimeter + Flush Connectors) */}
      <group>
        {/* South Apron Taxiway: x in [-94.3, +114.3] joining West Entry & East Perimeter flush */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, 0.016, APRON_TAXI_Z]}>
          <planeGeometry args={[208.6, 4.8]} />
          <meshStandardMaterial color={taxiSurfaceColor} roughness={0.88} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, 0.022, APRON_TAXI_Z]}>
          <planeGeometry args={[204, 0.22]} />
          <meshStandardMaterial color="#facc15" roughness={0.5} />
        </mesh>

        {/* North Perimeter Taxiway: x in [-94.3, +114.3] joining North Connectors & East Perimeter flush */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, 0.016, NORTH_TAXI_Z]}>
          <planeGeometry args={[208.6, 4.6]} />
          <meshStandardMaterial color={taxiSurfaceColor} roughness={0.88} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, 0.022, NORTH_TAXI_Z]}>
          <planeGeometry args={[204, 0.2]} />
          <meshStandardMaterial color="#facc15" roughness={0.5} />
        </mesh>

        {/* East Perimeter Taxiway: z in [-68.3, +66.3] joining North, South Apron & 08R/35 flush */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[EAST_TAXI_X, 0.016, -1]}>
          <planeGeometry args={[4.6, 134.6]} />
          <meshStandardMaterial color={taxiSurfaceColor} roughness={0.88} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[EAST_TAXI_X, 0.022, -1]}>
          <planeGeometry args={[0.2, 130]} />
          <meshStandardMaterial color="#facc15" roughness={0.5} />
        </mesh>

        {/* South Runway Connectors (segmented centerlines stop cleanly at runway edges) */}
        {[
          { x: WEST_ENTRY_X, full: true },
          { x: 0, full: true },
          { x: EAST_EXIT_X, full: false },
          { x: 92, full: true },
        ].map((c, idx) => (
          <group key={`south-conn-${idx}`}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 0.015, c.full ? 41 : 28]}>
              <planeGeometry args={[4.6, c.full ? 46 : 20]} />
              <meshStandardMaterial color={taxiSurfaceColor} roughness={0.88} />
            </mesh>
            {/* Centerline between Apron (z=18) and 08L edge (z=32.5) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 0.025, 25.25]}>
              <planeGeometry args={[0.24, 14.5]} />
              <meshStandardMaterial color="#facc15" roughness={0.5} />
            </mesh>
            {/* Centerline between 08L edge (z=43.5) and 08R edge (z=58.5) */}
            {c.full && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 0.025, 51]}>
                <planeGeometry args={[0.24, 15]} />
                <meshStandardMaterial color="#facc15" roughness={0.5} />
              </mesh>
            )}
          </group>
        ))}

        {/* North Runway 09L / 27R Connectors (z = -66 to -82) */}
        {[WEST_ENTRY_X, -62, 84].map((nx, idx) => (
          <group key={`north-conn-${idx}`}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[nx, 0.015, -74]}>
              <planeGeometry args={[4.6, 16]} />
              <meshStandardMaterial color={taxiSurfaceColor} roughness={0.88} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[nx, 0.025, -71.5]}>
              <planeGeometry args={[0.24, 11]} />
              <meshStandardMaterial color="#facc15" roughness={0.5} />
            </mesh>
          </group>
        ))}

        {/* East Crosswind Runway 17 / 35 Feeders (x = 112 to 128) */}
        {[RUNWAY_SOUTH_DEP_Z, APRON_TAXI_Z, NORTH_TAXI_Z].map((ez, idx) => (
          <group key={`east-feeder-${idx}`}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[120, 0.015, ez]}>
              <planeGeometry args={[16, 4.6]} />
              <meshStandardMaterial color={taxiSurfaceColor} roughness={0.88} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[117.5, 0.025, ez]}>
              <planeGeometry args={[11, 0.24]} />
              <meshStandardMaterial color="#facc15" roughness={0.5} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 4 MULTI-SIDED RUNWAYS */}
      {/* 1. South Inner Arrivals 08L / 26R */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.026, RUNWAY_SOUTH_ARR_Z]} receiveShadow={!isClay}>
        <planeGeometry args={[RUNWAY_LENGTH, RUNWAY_WIDTH]} />
        <meshStandardMaterial map={rwySouthArrTex} roughness={isClay ? 0.9 : 0.82} />
      </mesh>

      {/* 2. South Outer Departures 08R / 26L */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.026, RUNWAY_SOUTH_DEP_Z]} receiveShadow={!isClay}>
        <planeGeometry args={[RUNWAY_LENGTH, RUNWAY_WIDTH]} />
        <meshStandardMaterial map={rwySouthDepTex} roughness={isClay ? 0.9 : 0.82} />
      </mesh>

      {/* 3. North Parallel Runway 09L / 27R */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.026, RUNWAY_NORTH_Z]} receiveShadow={!isClay}>
        <planeGeometry args={[RUNWAY_NORTH_LENGTH, 10]} />
        <meshStandardMaterial map={rwyNorthTex} roughness={isClay ? 0.9 : 0.82} />
      </mesh>

      {/* 4. East Crosswind Runway 17 / 35 */}
      <mesh
        rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
        position={[RUNWAY_EAST_X, 0.026, -7]}
        receiveShadow={!isClay}
      >
        <planeGeometry args={[RUNWAY_EAST_LENGTH, 10]} />
        <meshStandardMaterial map={rwyEastTex} roughness={isClay ? 0.9 : 0.82} />
      </mesh>

      {/* PAPI 4-Light Indicators */}
      {[RUNWAY_SOUTH_ARR_Z, RUNWAY_SOUTH_DEP_Z].map((rz) => (
        <group key={`papi-${rz}`} position={[-RUNWAY_LENGTH / 2 + 18, 0.25, rz + RUNWAY_WIDTH / 2 + 2.2]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={`papi-lamp-${i}`} position={[0, 0, i * 0.9]}>
              <boxGeometry args={[0.45, 0.26, 0.45]} />
              <meshStandardMaterial
                color={i < 2 ? '#ef4444' : '#ffffff'}
                emissive={i < 2 ? '#ff2424' : '#ffffff'}
                emissiveIntensity={2.5 * lightMult}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Instanced Runway & Taxiway Lights */}
      <instancedMesh ref={blueEdgeRef} args={[undefined, undefined, blueEdgePositions.length]}>
        <sphereGeometry args={[0.13, 6, 6]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={1.5 * lightMult}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={greenCenterRef} args={[undefined, undefined, greenCenterPositions.length]}>
        <sphereGeometry args={[0.11, 6, 6]} />
        <meshStandardMaterial
          color="#4ade80"
          emissive="#22c55e"
          emissiveIntensity={1.4 * lightMult}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={runwayEdgeRef} args={[undefined, undefined, runwayEdgePositions.length]}>
        <sphereGeometry args={[0.15, 6, 6]} />
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#fef3c7"
          emissiveIntensity={1.7 * lightMult}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={approachRabbitRef} args={[undefined, undefined, approachPositions.length]}>
        <sphereGeometry args={[0.2, 6, 6]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#bae6fd"
          emissiveIntensity={2.2 * lightMult}
          toneMapped={false}
        />
      </instancedMesh>

      {/* ==================================================================== */}
      {/* FUTURISTIC ZAHA-STYLE RING HUB TERMINAL COMPLEX (PURE ARCHITECTURE)  */}
      {/* ==================================================================== */}
      <group>
        {/* Central Elliptical Lattice Glass Dome Hub */}
        <group position={[0, 0, -14]}>
          <mesh position={[0, 0.5, 0]} receiveShadow={!isClay}>
            <cylinderGeometry args={[17, 19, 1.0, 32]} />
            <meshStandardMaterial color={shellWhite} roughness={0.45} />
          </mesh>
          {/* Glowing Interior Atrium Core */}
          <mesh position={[0, 3.6, 0]} scale={[1.35, 0.65, 0.92]}>
            <sphereGeometry args={[11, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color="#bae6fd"
              emissive="#38bdf8"
              emissiveIntensity={interiorEmissive * 0.95}
              roughness={0.25}
            />
          </mesh>
          {/* Outer Sculpted Glass Lattice Shell */}
          <mesh position={[0, 3.8, 0]} scale={[1.48, 0.72, 1.02]}>
            <sphereGeometry args={[12.4, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            {isClay ? (
              <meshStandardMaterial color="#f8fafc" roughness={0.55} />
            ) : (
              <meshPhysicalMaterial
                color="#e0f2fe"
                transparent
                opacity={0.52}
                roughness={0.08}
                metalness={0.2}
              />
            )}
          </mesh>
          {/* Architectural Diagrid Rib Arches */}
          {[-0.6, -0.3, 0, 0.3, 0.6].map((rot, idx) => (
            <mesh key={`rib-${idx}`} position={[0, 3.8, 0]} rotation={[0, rot, 0]} scale={[1.49, 0.73, 1.03]}>
              <torusGeometry args={[12.4, 0.22, 8, 36, Math.PI]} />
              <meshStandardMaterial color={shellWhite} roughness={0.3} metalness={0.35} />
            </mesh>
          ))}

          {/* Illuminated Crest Sign: CHIȘINĂU INTERNATIONAL · RMO */}
          <group position={[0, 12.6, 8.2]}>
            <mesh position={[-10, -1.3, -0.1]}>
              <boxGeometry args={[0.4, 2.2, 0.4]} />
              <meshStandardMaterial color="#334155" metalness={0.6} />
            </mesh>
            <mesh position={[10, -1.3, -0.1]}>
              <boxGeometry args={[0.4, 2.2, 0.4]} />
              <meshStandardMaterial color="#334155" metalness={0.6} />
            </mesh>
            <mesh>
              <boxGeometry args={[28.6, 2.25, 0.42]} />
              <meshStandardMaterial color="#0b1526" metalness={0.65} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.24]}>
              <planeGeometry args={[27.8, 1.95]} />
              <meshStandardMaterial
                map={signTex}
                emissiveMap={signTex}
                emissive="#ffffff"
                emissiveIntensity={isClay ? 0.8 : lightingMode === 'night' ? 2.1 : 1.15}
                toneMapped={false}
              />
            </mesh>
          </group>
        </group>

        {/* Circular Sky-Ring Concourse & Eco-Atrium Courtyard */}
        <group position={[0, 0, -34]}>
          {/* Elevated Ring Skywalk */}
          <mesh position={[0, 4.2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.28, 1, 0.42]} castShadow={!isClay}>
            <torusGeometry args={[21, 3.4, 16, 48]} />
            <meshStandardMaterial color={shellWhite} roughness={0.35} metalness={0.25} />
          </mesh>
          {/* Glowing Inner Ring Glass Facade */}
          <mesh position={[0, 3.2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.28, 1, 0.36]}>
            <torusGeometry args={[21, 2.5, 12, 48]} />
            <meshStandardMaterial
              color="#7dd3fc"
              emissive="#38bdf8"
              emissiveIntensity={interiorEmissive * 0.75}
              roughness={0.2}
            />
          </mesh>

          {/* Reflective Eco-Lagoon Water Basins inside Courtyard */}
          {[-7.5, 7.5].map((lx, idx) => (
            <mesh key={`lagoon-${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[lx, 0.04, 1]}>
              <circleGeometry args={[6.4, 24]} />
              {isClay ? (
                <meshStandardMaterial color="#93c5fd" roughness={0.45} />
              ) : (
                <meshPhysicalMaterial
                  color="#0284c7"
                  roughness={0.08}
                  metalness={0.15}
                  reflectivity={0.95}
                />
              )}
            </mesh>
          ))}
        </group>

        {/* 4 Oval Solar-Ribbed Satellite Pavilions */}
        {PAVILION_COORDS.map(([px, pz, rot], idx) => (
          <group key={`pav-${idx}`} position={[px, 0, pz]} rotation={[0, rot, 0]}>
            <mesh position={[0, 2.2, 0]} scale={[1.45, 0.48, 0.95]} castShadow={!isClay}>
              <sphereGeometry args={[9.2, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={shellWhite} roughness={0.35} metalness={0.22} />
            </mesh>
            {/* Skylight Solar Louvre Strip */}
            <mesh position={[0, 4.6, 0]} scale={[1.2, 0.35, 0.65]}>
              <boxGeometry args={[12, 0.4, 7]} />
              <meshStandardMaterial
                color={isClay ? '#cbd5e1' : '#1e3a5f'}
                emissive="#38bdf8"
                emissiveIntensity={interiorEmissive * 0.65}
                metalness={0.55}
                roughness={0.2}
              />
            </mesh>
            {/* Skybridge Connector toward Center */}
            <mesh position={[-px * 0.34, 3.2, -pz * 0.14]} rotation={[0, -rot * 0.5, 0]}>
              <boxGeometry args={[16, 1.8, 3.4]} />
              <meshStandardMaterial color={accentRib} roughness={0.35} />
            </mesh>
          </group>
        ))}

        {/* Sweeping Curved South Concourse Wing (Gates G1–G6) */}
        <group position={[0, 0, -2.5]}>
          <mesh position={[0, 2.4, 0]} castShadow={!isClay}>
            <boxGeometry args={[94, 4.0, 5.2]} />
            <meshStandardMaterial
              color={isClay ? '#e2e8f0' : '#0f2744'}
              emissive="#38bdf8"
              emissiveIntensity={interiorEmissive * 0.55}
              roughness={0.22}
            />
          </mesh>
          <mesh position={[0, 4.8, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.42, 1, 1.35]}>
            <cylinderGeometry args={[3.6, 3.6, 98, 20, 1, false, -Math.PI * 0.4, Math.PI * 0.8]} />
            <meshStandardMaterial color={shellWhite} roughness={0.32} metalness={0.3} />
          </mesh>
        </group>

        {/* 6 Illuminated Boarding Gates & Telescopic Jet Bridges */}
        {Object.entries(GATE_COORDS).map(([gate, pos]) => {
          const isHeroGate = gate === 'G3';
          return (
            <group key={gate} position={[pos.x, 0, 0.5]}>
              <mesh position={[0, 2.3, 0]} castShadow={!isClay}>
                <cylinderGeometry args={[0.85, 0.85, 4.2, 12]} />
                <meshStandardMaterial color="#475569" metalness={0.55} roughness={0.3} />
              </mesh>
              <mesh position={[0, 4.2, 0.9]}>
                <boxGeometry args={[1.9, 0.72, 0.2]} />
                <meshStandardMaterial
                  color="#0284c7"
                  emissive="#38bdf8"
                  emissiveIntensity={1.6 * Math.max(0.7, lightMult * 0.45)}
                  toneMapped={false}
                />
              </mesh>
              <group ref={isHeroGate ? g3BridgeRef : undefined}>
                <mesh position={[0, 2.35, 2.6]}>
                  <boxGeometry args={[1.05, 1.15, 4.6]} />
                  <meshStandardMaterial
                    color="#bae6fd"
                    transparent
                    opacity={isClay ? 0.92 : 0.72}
                    roughness={0.2}
                  />
                </mesh>
                <mesh position={[0, 1.1, 4.1]}>
                  <cylinderGeometry args={[0.14, 0.18, 2.2, 8]} />
                  <meshStandardMaterial color="#334155" metalness={0.6} />
                </mesh>
              </group>
            </group>
          );
        })}

        {/* Clean West Landside Approach Boulevard & Roundabout (NO cars, NO people, zero runway crossings) */}
        <group>
          {/* West Highway Approach (x = -144 to -108, z = -26) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-126, 0.02, -26]}>
            <planeGeometry args={[36, 6.4]} />
            <meshStandardMaterial color={isClay ? '#cbd5e1' : '#26303d'} roughness={0.9} />
          </mesh>
          {[-140, -133, -126, -119, -112].map((dx) => (
            <mesh key={`w-dash-${dx}`} rotation={[-Math.PI / 2, 0, 0]} position={[dx, 0.03, -26]}>
              <planeGeometry args={[3.4, 0.22]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
          ))}

          {/* Flush West Landside Roundabout at (-98, -26) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-98, 0.025, -26]}>
            <ringGeometry args={[7.2, 12.2, 48]} />
            <meshStandardMaterial color={isClay ? '#cbd5e1' : '#2b3645'} roughness={0.88} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-98, 0.03, -26]}>
            <ringGeometry args={[9.6, 9.8, 48]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          {/* Roundabout Central Lagoon */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-98, 0.035, -26]}>
            <circleGeometry args={[7.0, 32]} />
            <meshStandardMaterial color={isClay ? '#93c5fd' : '#0284c7'} roughness={0.18} />
          </mesh>

          {/* Terminal Forecourt Boulevard (x = -87 to -55, z = -26) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-71, 0.02, -26]}>
            <planeGeometry args={[32, 6.4]} />
            <meshStandardMaterial color={isClay ? '#cbd5e1' : '#26303d'} roughness={0.9} />
          </mesh>
          {[-83, -76, -69, -62].map((dx) => (
            <mesh key={`f-dash-${dx}`} rotation={[-Math.PI / 2, 0, 0]} position={[dx, 0.03, -26]}>
              <planeGeometry args={[3.4, 0.22]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
          ))}
        </group>

        {/* Sculptural Mini Wind Turbines in Eco-Campus */}
        {WIND_TURBINE_COORDS.map(([wx, wz], idx) => (
          <group key={`turb-${idx}`} position={[wx, 0, wz]}>
            <mesh position={[0, 4.8, 0]}>
              <cylinderGeometry args={[0.12, 0.24, 9.6, 8]} />
              <meshStandardMaterial color={shellWhite} roughness={0.35} />
            </mesh>
            <group
              ref={(el) => {
                turbineRefs.current[idx] = el;
              }}
              position={[0, 9.5, 0.24]}
            >
              {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((ang, b) => (
                <mesh key={`blade-${b}`} rotation={[0, 0, ang]} position={[0, 0, 0]}>
                  <boxGeometry args={[0.16, 2.8, 0.06]} />
                  <meshStandardMaterial color={shellWhite} roughness={0.3} />
                </mesh>
              ))}
            </group>
          </group>
        ))}

        {/* Landscaped Stylized Architectural Tree Clusters (clear of all roads & ATC island) */}
        {[
          [-68, -46], [-56, -54], [-40, -64], [0, -60], [40, -62], [62, -46], [68, -22],
          [-72, -10], [-20, -34], [20, -34], [64, -8], [-112, -38], [-112, -14],
        ].map(([tx, tz], idx) => (
          <group key={`tree-${idx}`} position={[tx, 0, tz]} scale={0.85 + (idx % 3) * 0.16}>
            <mesh position={[0, 0.85, 0]}>
              <cylinderGeometry args={[0.16, 0.24, 1.7, 6]} />
              <meshStandardMaterial color={isClay ? '#cbd5e1' : '#5c4033'} roughness={0.9} />
            </mesh>
            <mesh position={[0, 2.3, 0]}>
              <coneGeometry args={[1.3, 2.6, 8]} />
              <meshStandardMaterial color={isClay ? '#86efac' : '#15803d'} roughness={0.85} />
            </mesh>
          </group>
        ))}
      </group>

      {/* SCULPTURAL ATC CONTROL SPIRE (Dedicated Landscaped Island, completely clear of roads & taxiways) */}
      <group position={[-62, 0, 2]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <circleGeometry args={[5.4, 24]} />
          <meshStandardMaterial color={isClay ? '#e2e8f0' : '#475569'} roughness={0.75} />
        </mesh>
        <mesh position={[0, 1.4, 0]} castShadow={!isClay}>
          <cylinderGeometry args={[3.2, 3.8, 2.8, 12]} />
          <meshStandardMaterial color="#334155" metalness={0.45} roughness={0.5} />
        </mesh>
        <mesh position={[0, 9.4, 0]} castShadow={!isClay}>
          <cylinderGeometry args={[1.7, 2.5, 14, 16]} />
          <meshStandardMaterial color={shellWhite} metalness={0.28} roughness={0.32} />
        </mesh>
        <mesh position={[0, 16.8, 0]}>
          <cylinderGeometry args={[3.4, 1.8, 1.8, 12]} />
          <meshStandardMaterial color="#475569" metalness={0.65} roughness={0.3} />
        </mesh>
        <mesh position={[0, 18.6, 0]}>
          <cylinderGeometry args={[3.7, 3.25, 2.2, 10]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.65} roughness={0.1} />
        </mesh>
        <mesh position={[0, 18.3, 0]}>
          <cylinderGeometry args={[2.3, 2.3, 1.0, 10]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive="#22d3ee"
            emissiveIntensity={isClay ? 0.6 : lightingMode === 'night' ? 2.4 : 1.2}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 20.0, 0]}>
          <cylinderGeometry args={[2.5, 3.85, 0.8, 10]} />
          <meshStandardMaterial color={shellWhite} metalness={0.5} roughness={0.25} />
        </mesh>
        <group ref={radarRef} position={[0, 21.0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.25, 0.35, 1.1, 10]} />
            <meshStandardMaterial color="#64748b" metalness={0.75} />
          </mesh>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[3.1, 0.48, 0.28]} />
            <meshStandardMaterial color={shellWhite} />
          </mesh>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[2.9, 0.14, 0.32]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#38bdf8"
              emissiveIntensity={2.0 * Math.max(0.5, lightMult * 0.5)}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>

      {/* Parked Ambient Commercial Airliners at Gates G1, G5, G6 (Nose North toward Concourse) */}
      <group position={[GATE_COORDS.G1.x, 0, GATE_COORDS.G1.z]} rotation={[0, Math.PI / 2, 0]}>
        <AircraftModel variant="b737" livery="euro" thrustLevel={0.05} lightingMode={lightingMode} quality={quality} />
      </group>
      <group position={[GATE_COORDS.G5.x, 0, GATE_COORDS.G5.z]} rotation={[0, Math.PI / 2, 0]}>
        <AircraftModel variant="a350" livery="sky" thrustLevel={0.05} lightingMode={lightingMode} quality={quality} />
      </group>
      <group position={[GATE_COORDS.G6.x, 0, GATE_COORDS.G6.z]} rotation={[0, Math.PI / 2, 0]}>
        <AircraftModel variant="a380" livery="pacific" thrustLevel={0.05} lightingMode={lightingMode} quality={quality} />
      </group>
    </group>
  );
};
