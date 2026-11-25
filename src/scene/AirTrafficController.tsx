import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AircraftVariant, AirlineLivery, LightingMode, TakeoffPhase } from '../types/aviation';
import {
  APRON_TAXI_Z,
  HIGH_SPEED_EXIT_X,
  RUNWAY_LEFT_Z,
  RUNWAY_RIGHT_Z,
  WEST_ENTRY_X,
} from './airportLayout';
import { AircraftModel } from './AircraftModel';

interface AirTrafficControllerProps {
  lightingMode: LightingMode;
  heroTakeoffPhase: TakeoffPhase;
}

interface SmokePuff {
  active: boolean;
  age: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

const ARRIVAL_CYCLE = 28;
const DEPARTURE_CYCLE = 26;
const SMOKE_COUNT = 28;

function ArrivalPlane({
  offsetSec,
  variant,
  livery,
  lightingMode,
  onTouchdown,
}: {
  offsetSec: number;
  variant: AircraftVariant;
  livery: AirlineLivery;
  lightingMode: LightingMode;
  onTouchdown: (x: number, z: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [gear, setGear] = React.useState(1);
  const [thrust, setThrust] = React.useState(0.45);
  const [reverse, setReverse] = React.useState(false);
  const [lights, setLights] = React.useState(true);
  const prevCycleRef = useRef(-1);
  const smokedThisCycleRef = useRef(false);
  const stateTickRef = useRef(0);

  useFrame((state) => {
    if (!groupRef.current) return;
    const elapsed = state.clock.elapsedTime + offsetSec;
    const cycleIdx = Math.floor(elapsed / ARRIVAL_CYCLE);
    const t = elapsed % ARRIVAL_CYCLE;

    if (cycleIdx !== prevCycleRef.current) {
      prevCycleRef.current = cycleIdx;
      smokedThisCycleRef.current = false;
    }

    let x = -175;
    let y = 24;
    let z = RUNWAY_LEFT_Z;
    let heading = 0;
    let pitch = -0.06;
    let scale = 1;
    let curThrust = 0.4;
    let curRev = false;
    let curLights = true;

    if (t < 9) {
      // Glideslope descent & flare
      const u = t / 9;
      x = THREE.MathUtils.lerp(-175, -52, u);
      const glideY = THREE.MathUtils.lerp(23.5, 0.25, Math.pow(u, 0.92));
      y = Math.max(0, glideY - (u > 0.85 ? (u - 0.85) * 1.4 : 0));
      pitch = u < 0.78 ? -0.065 : THREE.MathUtils.lerp(-0.065, 0.095, (u - 0.78) / 0.22);
      scale = t < 0.7 ? t / 0.7 : 1;
      curThrust = 0.42;
    } else if (t < 15.5) {
      // Touchdown + reverse thrust rollout on 08L
      if (!smokedThisCycleRef.current) {
        smokedThisCycleRef.current = true;
        onTouchdown(-51, RUNWAY_LEFT_Z);
      }
      const u = (t - 9) / 6.5;
      const eased = 1 - Math.pow(1 - u, 1.8);
      x = THREE.MathUtils.lerp(-52, HIGH_SPEED_EXIT_X, eased);
      y = 0;
      pitch = t < 10.2 ? THREE.MathUtils.lerp(0.095, 0, (t - 9) / 1.2) : 0;
      curRev = t < 13.5;
      curThrust = curRev ? 0.78 : 0.22;
    } else if (t < 20) {
      // Turn north off 08L onto high-speed exit toward apron taxiway
      const u = (t - 15.5) / 4.5;
      x = HIGH_SPEED_EXIT_X + Math.sin(u * Math.PI) * 1.5;
      z = THREE.MathUtils.lerp(RUNWAY_LEFT_Z, APRON_TAXI_Z, u);
      heading = u < 0.25
        ? THREE.MathUtils.lerp(0, Math.PI / 2, u / 0.25)
        : u > 0.75
          ? THREE.MathUtils.lerp(Math.PI / 2, Math.PI, (u - 0.75) / 0.25)
          : Math.PI / 2;
      y = 0;
      pitch = 0;
      curThrust = 0.2;
      curLights = false;
    } else {
      // Taxi west along apron taxiway toward terminal gates & fade out cleanly
      const u = (t - 20) / (ARRIVAL_CYCLE - 20);
      x = THREE.MathUtils.lerp(HIGH_SPEED_EXIT_X, -24, u);
      z = APRON_TAXI_Z;
      heading = Math.PI;
      y = 0;
      pitch = 0;
      curThrust = 0.16;
      curLights = false;
      scale = u > 0.88 ? Math.max(0.01, (1 - u) / 0.12) : 1;
    }

    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.order = 'YZX';
    groupRef.current.rotation.set(0, heading, pitch);
    groupRef.current.scale.setScalar(scale);

    stateTickRef.current += 1;
    if (stateTickRef.current % 6 === 0) {
      setGear(1);
      setThrust(curThrust);
      setReverse(curRev);
      setLights(curLights);
    }
  });

  return (
    <group ref={groupRef}>
      <AircraftModel
        variant={variant}
        livery={livery}
        gearDeploy={gear}
        thrustLevel={thrust}
        showReverseThrust={reverse}
        landingLights={lights}
        lightingMode={lightingMode}
      />
    </group>
  );
}

function DeparturePlane({
  offsetSec,
  variant,
  livery,
  lightingMode,
  yieldForHero,
}: {
  offsetSec: number;
  variant: AircraftVariant;
  livery: AirlineLivery;
  lightingMode: LightingMode;
  yieldForHero: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [gear, setGear] = React.useState(1);
  const [thrust, setThrust] = React.useState(0.2);
  const [lights, setLights] = React.useState(false);
  const stateTickRef = useRef(0);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = (state.clock.elapsedTime + offsetSec) % DEPARTURE_CYCLE;

    // Hold clear off Runway 08R when hero flight has active takeoff clearance
    if (yieldForHero && t < 8.5) {
      groupRef.current.position.set(WEST_ENTRY_X, 0, RUNWAY_LEFT_Z + 12);
      groupRef.current.rotation.order = 'YZX';
      groupRef.current.rotation.set(0, -Math.PI / 2, 0);
      groupRef.current.scale.setScalar(0.95);
      return;
    }

    let x = WEST_ENTRY_X;
    let y = 0;
    let z = RUNWAY_RIGHT_Z;
    let heading = 0;
    let pitch = 0;
    let bank = 0;
    let scale = 1;
    let curGear = 1;
    let curThrust = 0.2;
    let curLights = false;

    if (t < 4.5) {
      // Taxi onto Runway 08R via west entry taxiway
      const u = t / 4.5;
      x = THREE.MathUtils.lerp(WEST_ENTRY_X, -74, u);
      z = THREE.MathUtils.lerp(18, RUNWAY_RIGHT_Z, Math.min(1, u * 1.15));
      heading = u < 0.65 ? -Math.PI / 2 : THREE.MathUtils.lerp(-Math.PI / 2, 0, (u - 0.65) / 0.35);
      scale = t < 0.5 ? t / 0.5 : 1;
      curThrust = 0.22;
    } else if (t < 7.0) {
      // Hold short / line up & spool up engines
      const u = (t - 4.5) / 2.5;
      x = -74;
      z = RUNWAY_RIGHT_Z;
      heading = 0;
      curThrust = THREE.MathUtils.lerp(0.25, 0.98, u);
      curLights = true;
    } else if (t < 13.5) {
      // Accelerate down Runway 08R & rotate at V2
      const u = (t - 7.0) / 6.5;
      x = THREE.MathUtils.lerp(-74, 22, u * u);
      z = RUNWAY_RIGHT_Z;
      y = u > 0.86 ? THREE.MathUtils.lerp(0, 1.4, (u - 0.86) / 0.14) : 0;
      pitch = u > 0.78 ? THREE.MathUtils.lerp(0, 0.24, (u - 0.78) / 0.22) : 0;
      curThrust = 1.0;
      curLights = true;
    } else {
      // Liftoff, retract landing gear, climb smoothly into the sky
      const u = (t - 13.5) / (DEPARTURE_CYCLE - 13.5);
      x = THREE.MathUtils.lerp(22, 215, u);
      y = THREE.MathUtils.lerp(1.4, 44, Math.pow(u, 1.12));
      z = RUNWAY_RIGHT_Z + Math.pow(Math.max(0, u - 0.25), 1.6) * 26;
      pitch = THREE.MathUtils.lerp(0.24, 0.14, u);
      bank = u > 0.25 && u < 0.85 ? 0.18 * Math.sin(((u - 0.25) / 0.6) * Math.PI) : 0;
      heading = -Math.pow(Math.max(0, u - 0.25), 1.4) * 0.28;
      curGear = t < 15 ? 1 : t > 18 ? 0 : 1 - (t - 15) / 3;
      curThrust = 0.95;
      curLights = t < 19;
      scale = u > 0.88 ? Math.max(0.01, (1 - u) / 0.12) : 1;
    }

    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.order = 'YZX';
    groupRef.current.rotation.set(bank, heading, pitch);
    groupRef.current.scale.setScalar(scale);

    stateTickRef.current += 1;
    if (stateTickRef.current % 6 === 0) {
      setGear(curGear);
      setThrust(curThrust);
      setLights(curLights);
    }
  });

  return (
    <group ref={groupRef}>
      <AircraftModel
        variant={variant}
        livery={livery}
        gearDeploy={gear}
        thrustLevel={thrust}
        landingLights={lights}
        lightingMode={lightingMode}
      />
    </group>
  );
}

export const AirTrafficController: React.FC<AirTrafficControllerProps> = ({
  lightingMode,
  heroTakeoffPhase,
}) => {
  const smokeMeshRef = useRef<THREE.InstancedMesh>(null);
  const smokePool = useMemo<SmokePuff[]>(
    () =>
      Array.from({ length: SMOKE_COUNT }, () => ({
        active: false,
        age: 0,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
      })),
    []
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const triggerTouchdownSmoke = (tx: number, tz: number) => {
    let spawned = 0;
    for (let i = 0; i < smokePool.length && spawned < 10; i++) {
      const p = smokePool[i];
      if (!p.active || p.age > 1.8) {
        p.active = true;
        p.age = 0;
        p.x = tx + (Math.random() - 0.5) * 3.5;
        p.y = 0.25;
        p.z = tz + (Math.random() - 0.5) * 1.4;
        p.vx = 1.5 + Math.random() * 2.5;
        p.vy = 0.6 + Math.random() * 1.1;
        p.vz = (Math.random() - 0.5) * 1.8;
        spawned++;
      }
    }
  };

  useFrame((_, delta) => {
    if (!smokeMeshRef.current) return;
    for (let i = 0; i < smokePool.length; i++) {
      const p = smokePool[i];
      if (!p.active) {
        dummy.position.set(0, -20, 0);
        dummy.scale.setScalar(0.001);
      } else {
        p.age += delta;
        if (p.age > 2.2) {
          p.active = false;
          dummy.position.set(0, -20, 0);
          dummy.scale.setScalar(0.001);
        } else {
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.z += p.vz * delta;
          p.vx *= 0.96;
          p.vy *= 0.95;
          const life = p.age / 2.2;
          const s = (0.35 + life * 1.8) * (1 - life * 0.65);
          dummy.position.set(p.x, p.y, p.z);
          dummy.scale.setScalar(Math.max(0.01, s));
        }
      }
      dummy.updateMatrix();
      smokeMeshRef.current.setMatrixAt(i, dummy.matrix);
    }
    smokeMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  const yieldForHero = heroTakeoffPhase !== 'idle';

  return (
    <group>
      {/* Left Runway 08L — Continuous Arrivals */}
      <ArrivalPlane
        offsetSec={2}
        variant="b787"
        livery="nova"
        lightingMode={lightingMode}
        onTouchdown={triggerTouchdownSmoke}
      />
      <ArrivalPlane
        offsetSec={16}
        variant="a320"
        livery="euro"
        lightingMode={lightingMode}
        onTouchdown={triggerTouchdownSmoke}
      />

      {/* Right Runway 08R — Continuous Departures */}
      <DeparturePlane
        offsetSec={0}
        variant="b737"
        livery="sky"
        lightingMode={lightingMode}
        yieldForHero={yieldForHero}
      />
      <DeparturePlane
        offsetSec={13}
        variant="a350"
        livery="pacific"
        lightingMode={lightingMode}
        yieldForHero={yieldForHero}
      />

      {/* Pooled Touchdown Tire Smoke Particles */}
      <instancedMesh ref={smokeMeshRef} args={[undefined, undefined, SMOKE_COUNT]}>
        <sphereGeometry args={[0.7, 10, 10]} />
        <meshStandardMaterial
          color="#f1f5f9"
          transparent
          opacity={0.42}
          roughness={1}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
};
