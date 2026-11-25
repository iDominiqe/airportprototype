import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphicsQuality, LightingMode, TakeoffPhase } from '../types/aviation';
import {
  APRON_TAXI_Z,
  createSmoothPath,
  EAST_EXIT_X,
  EAST_TAXI_X,
  NORTH_TAXI_Z,
  RUNWAY_EAST_X,
  RUNWAY_NORTH_Z,
  RUNWAY_SOUTH_ARR_Z,
  RUNWAY_SOUTH_DEP_Z,
  WEST_ENTRY_X,
} from './airportLayout';
import { AircraftModel } from './AircraftModel';
import { HeroTrackSnapshot } from './HeroTakeoffAircraft';

interface AirTrafficControllerProps {
  lightingMode: LightingMode;
  quality: GraphicsQuality;
  heroTakeoffPhase: TakeoffPhase;
  heroTrackRef: React.MutableRefObject<HeroTrackSnapshot>;
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

const SMOKE_COUNT = 32;

function lerpAngle(current: number, target: number, alpha: number): number {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * alpha;
}

type TrafficRegistry = React.MutableRefObject<
  Record<string, { pos: THREE.Vector3; heading: number; active: boolean }>
>;

function hasConflictAhead(
  selfId: string,
  selfPos: THREE.Vector3,
  selfHeading: number,
  registry: TrafficRegistry,
  heroTrackRef: React.MutableRefObject<HeroTrackSnapshot>
): boolean {
  const fwdX = Math.cos(selfHeading);
  const fwdZ = -Math.sin(selfHeading);

  const checkPoint = (otherPos: THREE.Vector3) => {
    const dx = otherPos.x - selfPos.x;
    const dz = otherPos.z - selfPos.z;
    const distSq = dx * dx + dz * dz;
    if (distSq > 24 * 24 || distSq < 0.01) return false;
    const dist = Math.sqrt(distSq);
    const dot = (dx * fwdX + dz * fwdZ) / dist;
    return dot > 0.35; // Other aircraft is ahead within 24 units
  };

  for (const [id, slot] of Object.entries(registry.current)) {
    if (id === selfId || !slot.active) continue;
    if (slot.pos.y > 2.5) continue;
    if (checkPoint(slot.pos)) return true;
  }

  if (heroTrackRef.current.position.y <= 2.5 && checkPoint(heroTrackRef.current.position)) {
    return true;
  }
  return false;
}

// 1. South Inner 08L Arrival -> Calm Rollout -> East-South Exit -> East Remote Stand
function SouthArrivalPlane({
  lightingMode,
  quality,
  registry,
  heroTrackRef,
  onTouchdown,
}: {
  lightingMode: LightingMode;
  quality: GraphicsQuality;
  registry: TrafficRegistry;
  heroTrackRef: React.MutableRefObject<HeroTrackSnapshot>;
  onTouchdown: (x: number, z: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const simTimeRef = useRef(2.0);
  const headingRef = useRef(0);
  const smokedRef = useRef(false);
  const [gear, setGear] = React.useState(1);
  const [thrust, setThrust] = React.useState(0.4);
  const [reverse, setReverse] = React.useState(false);
  const [lights, setLights] = React.useState(true);
  const tickRef = useRef(0);

  const taxiExitSpline = useMemo(
    () =>
      createSmoothPath([
        [36, 0, RUNWAY_SOUTH_ARR_Z],
        [EAST_EXIT_X - 4, 0, RUNWAY_SOUTH_ARR_Z - 2],
        [EAST_EXIT_X, 0, RUNWAY_SOUTH_ARR_Z - 9],
        [EAST_EXIT_X + 3, 0, APRON_TAXI_Z + 3],
        [EAST_EXIT_X + 14, 0, APRON_TAXI_Z],
        [82, 0, APRON_TAXI_Z],
      ]),
    []
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(0.05, delta);
    const CYCLE = 34;

    const curPos = groupRef.current.position;
    const onGround = curPos.y < 0.5 && (simTimeRef.current % CYCLE) > 10;
    const blocked =
      onGround &&
      hasConflictAhead('south-arr', curPos, headingRef.current, registry, heroTrackRef);

    if (!blocked) {
      simTimeRef.current += dt;
    }

    const t = simTimeRef.current % CYCLE;
    if (t < 1.0) smokedRef.current = false;

    let x = -185;
    let y = 24;
    let z = RUNWAY_SOUTH_ARR_Z;
    let targetHeading = 0;
    let pitch = -0.06;
    let scale = 1;
    let curThrust = 0.4;
    let curRev = false;
    let curLights = true;

    if (t < 10.5) {
      // Glideslope descent & flare onto 08L
      const u = t / 10.5;
      x = THREE.MathUtils.lerp(-185, -56, u);
      y = Math.max(0, THREE.MathUtils.lerp(24, 0, Math.pow(u, 0.9)));
      pitch = u < 0.8 ? -0.06 : THREE.MathUtils.lerp(-0.06, 0.085, (u - 0.8) / 0.2);
      scale = t < 0.8 ? t / 0.8 : 1;
    } else if (t < 18.5) {
      // Touchdown + smooth deceleration rollout (180 -> 30 km/h)
      if (!smokedRef.current) {
        smokedRef.current = true;
        onTouchdown(-55, RUNWAY_SOUTH_ARR_Z);
      }
      const u = (t - 10.5) / 8.0;
      const eased = 1 - Math.pow(1 - u, 2.1);
      x = THREE.MathUtils.lerp(-56, 36, eased);
      y = 0;
      pitch = t < 11.8 ? THREE.MathUtils.lerp(0.085, 0, (t - 10.5) / 1.3) : 0;
      curRev = t < 15.2;
      curThrust = curRev ? 0.72 : 0.2;
    } else if (t < 31.5) {
      // Calm spline taxi off 08L to East Remote Stand (~3.6 u/s)
      const u = (t - 18.5) / 13.0;
      const pt = taxiExitSpline.getPointAt(u);
      const tan = taxiExitSpline.getTangentAt(u);
      x = pt.x;
      y = 0;
      z = pt.z;
      targetHeading = Math.atan2(-tan.z, tan.x);
      pitch = 0;
      curThrust = blocked ? 0.08 : 0.16;
      curLights = false;
    } else {
      // Parked & graceful fade before next approach cycle
      const u = (t - 31.5) / (CYCLE - 31.5);
      x = 82;
      y = 0;
      z = APRON_TAXI_Z;
      targetHeading = 0;
      pitch = 0;
      curThrust = 0.05;
      curLights = false;
      scale = Math.max(0.01, 1 - u);
    }

    headingRef.current = lerpAngle(headingRef.current, targetHeading, dt * 6);
    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.order = 'YZX';
    groupRef.current.rotation.set(0, headingRef.current, pitch);
    groupRef.current.scale.setScalar(scale);

    registry.current['south-arr'] = {
      pos: groupRef.current.position.clone(),
      heading: headingRef.current,
      active: scale > 0.2,
    };

    tickRef.current += 1;
    if (tickRef.current % 6 === 0) {
      setGear(1);
      setThrust(curThrust);
      setReverse(curRev);
      setLights(curLights);
    }
  });

  return (
    <group ref={groupRef}>
      <AircraftModel
        variant="a350"
        livery="nova"
        gearDeploy={gear}
        thrustLevel={thrust}
        showReverseThrust={reverse}
        landingLights={lights}
        lightingMode={lightingMode}
        quality={quality}
      />
    </group>
  );
}

// 2. South Outer 08R Ambient Departure (strictly yields whenever Hero Takeoff is active)
function SouthDeparturePlane({
  lightingMode,
  quality,
  yieldForHero,
  registry,
  heroTrackRef,
}: {
  lightingMode: LightingMode;
  quality: GraphicsQuality;
  yieldForHero: boolean;
  registry: TrafficRegistry;
  heroTrackRef: React.MutableRefObject<HeroTrackSnapshot>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const simTimeRef = useRef(0);
  const headingRef = useRef(-Math.PI / 2);
  const [gear, setGear] = React.useState(1);
  const [thrust, setThrust] = React.useState(0.2);
  const [lights, setLights] = React.useState(false);
  const tickRef = useRef(0);

  const entrySpline = useMemo(
    () =>
      createSmoothPath([
        [WEST_ENTRY_X, 0, 44],
        [WEST_ENTRY_X, 0, RUNWAY_SOUTH_DEP_Z - 7],
        [WEST_ENTRY_X + 5, 0, RUNWAY_SOUTH_DEP_Z],
        [-78, 0, RUNWAY_SOUTH_DEP_Z],
      ]),
    []
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(0.05, delta);
    const CYCLE = 32;
    const curT = simTimeRef.current % CYCLE;

    // Hold short in West Holding Bay whenever Hero Takeoff is active and this plane hasn't started roll yet
    const heldForHero = yieldForHero && curT < 9.5;
    const blocked =
      heldForHero ||
      (curT < 9.5 &&
        hasConflictAhead('south-dep', groupRef.current.position, headingRef.current, registry, heroTrackRef));

    if (!blocked) {
      simTimeRef.current += dt;
    }

    const t = simTimeRef.current % CYCLE;
    let x = WEST_ENTRY_X;
    let y = 0;
    let z = 44;
    let targetHeading = -Math.PI / 2;
    let pitch = 0;
    let bank = 0;
    let scale = 1;
    let curGear = 1;
    let curThrust = 0.18;
    let curLights = false;

    if (t < 7.0) {
      const u = t / 7.0;
      const pt = entrySpline.getPointAt(u);
      const tan = entrySpline.getTangentAt(u);
      x = pt.x;
      z = pt.z;
      targetHeading = Math.atan2(-tan.z, tan.x);
      scale = t < 0.7 ? t / 0.7 : 1;
      curThrust = blocked ? 0.1 : 0.22;
    } else if (t < 10.0) {
      const u = (t - 7.0) / 3.0;
      x = -78;
      z = RUNWAY_SOUTH_DEP_Z;
      targetHeading = 0;
      curThrust = THREE.MathUtils.lerp(0.24, 0.98, u);
      curLights = true;
    } else if (t < 17.5) {
      const u = (t - 10.0) / 7.5;
      x = THREE.MathUtils.lerp(-78, 28, u * u);
      z = RUNWAY_SOUTH_DEP_Z;
      targetHeading = 0;
      y = u > 0.88 ? THREE.MathUtils.lerp(0, 1.2, (u - 0.88) / 0.12) : 0;
      pitch = u > 0.8 ? THREE.MathUtils.lerp(0, 0.23, (u - 0.8) / 0.2) : 0;
      curThrust = 1.0;
      curLights = true;
    } else {
      const u = (t - 17.5) / (CYCLE - 17.5);
      x = THREE.MathUtils.lerp(28, 225, u);
      y = THREE.MathUtils.lerp(1.2, 46, Math.pow(u, 1.12));
      z = RUNWAY_SOUTH_DEP_Z + Math.pow(Math.max(0, u - 0.25), 1.5) * 24;
      pitch = THREE.MathUtils.lerp(0.23, 0.14, u);
      bank = u > 0.25 && u < 0.85 ? 0.16 * Math.sin(((u - 0.25) / 0.6) * Math.PI) : 0;
      targetHeading = -Math.pow(Math.max(0, u - 0.25), 1.4) * 0.26;
      curGear = t < 19.2 ? 1 : t > 22.4 ? 0 : 1 - (t - 19.2) / 3.2;
      curThrust = 0.94;
      curLights = t < 23;
      scale = u > 0.88 ? Math.max(0.01, (1 - u) / 0.12) : 1;
    }

    headingRef.current = lerpAngle(headingRef.current, targetHeading, dt * 6);
    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.order = 'YZX';
    groupRef.current.rotation.set(bank, headingRef.current, pitch);
    groupRef.current.scale.setScalar(scale);

    registry.current['south-dep'] = {
      pos: groupRef.current.position.clone(),
      heading: headingRef.current,
      active: scale > 0.2,
    };

    tickRef.current += 1;
    if (tickRef.current % 6 === 0) {
      setGear(curGear);
      setThrust(curThrust);
      setLights(curLights);
    }
  });

  return (
    <group ref={groupRef}>
      <AircraftModel
        variant="b737"
        livery="sky"
        gearDeploy={gear}
        thrustLevel={thrust}
        landingLights={lights}
        lightingMode={lightingMode}
        quality={quality}
      />
    </group>
  );
}

// 3. North Runway 27R Westbound Arrival -> Calm Rollout -> North Perimeter Taxiway
function NorthArrivalPlane({
  lightingMode,
  quality,
  onTouchdown,
}: {
  lightingMode: LightingMode;
  quality: GraphicsQuality;
  onTouchdown: (x: number, z: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headingRef = useRef(Math.PI);
  const smokedRef = useRef(false);
  const [thrust, setThrust] = React.useState(0.4);
  const [reverse, setReverse] = React.useState(false);
  const [lights, setLights] = React.useState(true);
  const tickRef = useRef(0);

  const northExitSpline = useMemo(
    () =>
      createSmoothPath([
        [-42, 0, RUNWAY_NORTH_Z],
        [-58, 0, RUNWAY_NORTH_Z + 3],
        [-64, 0, RUNWAY_NORTH_Z + 12],
        [-52, 0, NORTH_TAXI_Z],
        [-8, 0, NORTH_TAXI_Z],
      ]),
    []
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(0.05, delta);
    const CYCLE = 36;
    const t = (state.clock.elapsedTime + 9) % CYCLE;
    if (t < 1.0) smokedRef.current = false;

    let x = 185;
    let y = 23;
    let z = RUNWAY_NORTH_Z;
    let targetHeading = Math.PI;
    let pitch = -0.06;
    let scale = 1;
    let curThrust = 0.4;
    let curRev = false;
    let curLights = true;

    if (t < 11) {
      const u = t / 11;
      x = THREE.MathUtils.lerp(185, 52, u);
      y = Math.max(0, THREE.MathUtils.lerp(23, 0, Math.pow(u, 0.9)));
      pitch = u < 0.8 ? -0.06 : THREE.MathUtils.lerp(-0.06, 0.08, (u - 0.8) / 0.2);
      scale = t < 0.8 ? t / 0.8 : 1;
    } else if (t < 19.5) {
      if (!smokedRef.current) {
        smokedRef.current = true;
        onTouchdown(50, RUNWAY_NORTH_Z);
      }
      const u = (t - 11) / 8.5;
      const eased = 1 - Math.pow(1 - u, 2.0);
      x = THREE.MathUtils.lerp(52, -42, eased);
      y = 0;
      pitch = t < 12.2 ? THREE.MathUtils.lerp(0.08, 0, (t - 11) / 1.2) : 0;
      curRev = t < 15.5;
      curThrust = curRev ? 0.7 : 0.2;
    } else if (t < 33.5) {
      const u = (t - 19.5) / 14.0;
      const pt = northExitSpline.getPointAt(u);
      const tan = northExitSpline.getTangentAt(u);
      x = pt.x;
      y = 0;
      z = pt.z;
      targetHeading = Math.atan2(-tan.z, tan.x);
      pitch = 0;
      curThrust = 0.16;
      curLights = false;
    } else {
      const u = (t - 33.5) / (CYCLE - 33.5);
      x = -8;
      y = 0;
      z = NORTH_TAXI_Z;
      targetHeading = 0;
      pitch = 0;
      curThrust = 0.05;
      curLights = false;
      scale = Math.max(0.01, 1 - u);
    }

    headingRef.current = lerpAngle(headingRef.current, targetHeading, dt * 6);
    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.order = 'YZX';
    groupRef.current.rotation.set(0, headingRef.current, pitch);
    groupRef.current.scale.setScalar(scale);

    tickRef.current += 1;
    if (tickRef.current % 6 === 0) {
      setThrust(curThrust);
      setReverse(curRev);
      setLights(curLights);
    }
  });

  return (
    <group ref={groupRef}>
      <AircraftModel
        variant="a320"
        livery="euro"
        gearDeploy={1}
        thrustLevel={thrust}
        showReverseThrust={reverse}
        landingLights={lights}
        lightingMode={lightingMode}
        quality={quality}
      />
    </group>
  );
}

// 4. East Crosswind Runway 35 Northbound Superjumbo (A380 4-Engine) Departure
function EastCrosswindDeparturePlane({
  lightingMode,
  quality,
}: {
  lightingMode: LightingMode;
  quality: GraphicsQuality;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headingRef = useRef(0);
  const [gear, setGear] = React.useState(1);
  const [thrust, setThrust] = React.useState(0.2);
  const [lights, setLights] = React.useState(false);
  const tickRef = useRef(0);

  const eastEntrySpline = useMemo(
    () =>
      createSmoothPath([
        [EAST_TAXI_X, 0, 44],
        [EAST_TAXI_X + 2, 0, 62],
        [RUNWAY_EAST_X - 4, 0, 65],
        [RUNWAY_EAST_X, 0, 60],
      ]),
    []
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(0.05, delta);
    const CYCLE = 36;
    const t = (state.clock.elapsedTime + 5) % CYCLE;

    let x = EAST_TAXI_X;
    let y = 0;
    let z = 44;
    let targetHeading = -Math.PI / 2;
    let pitch = 0;
    let scale = 1;
    let curGear = 1;
    let curThrust = 0.2;
    let curLights = false;

    if (t < 8.5) {
      const u = t / 8.5;
      const pt = eastEntrySpline.getPointAt(u);
      const tan = eastEntrySpline.getTangentAt(u);
      x = pt.x;
      z = pt.z;
      targetHeading = Math.atan2(-tan.z, tan.x);
      scale = t < 0.7 ? t / 0.7 : 1;
      curThrust = 0.22;
    } else if (t < 11.5) {
      const u = (t - 8.5) / 3.0;
      x = RUNWAY_EAST_X;
      z = 60;
      targetHeading = Math.PI / 2; // Northbound (-Z)
      curThrust = THREE.MathUtils.lerp(0.25, 1.0, u);
      curLights = true;
    } else if (t < 19.5) {
      const u = (t - 11.5) / 8.0;
      x = RUNWAY_EAST_X;
      z = THREE.MathUtils.lerp(60, -40, u * u);
      targetHeading = Math.PI / 2;
      y = u > 0.88 ? THREE.MathUtils.lerp(0, 1.2, (u - 0.88) / 0.12) : 0;
      pitch = u > 0.8 ? THREE.MathUtils.lerp(0, 0.23, (u - 0.8) / 0.2) : 0;
      curThrust = 1.0;
      curLights = true;
    } else {
      const u = (t - 19.5) / (CYCLE - 19.5);
      x = RUNWAY_EAST_X + Math.pow(Math.max(0, u - 0.25), 1.5) * 18;
      y = THREE.MathUtils.lerp(1.2, 46, Math.pow(u, 1.12));
      z = THREE.MathUtils.lerp(-40, -210, u);
      pitch = THREE.MathUtils.lerp(0.23, 0.14, u);
      targetHeading = Math.PI / 2 - Math.pow(Math.max(0, u - 0.25), 1.4) * 0.2;
      curGear = t < 21.5 ? 1 : t > 24.5 ? 0 : 1 - (t - 21.5) / 3.0;
      curThrust = 0.94;
      curLights = t < 25;
      scale = u > 0.88 ? Math.max(0.01, (1 - u) / 0.12) : 1;
    }

    headingRef.current = lerpAngle(headingRef.current, targetHeading, dt * 6);
    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.order = 'YZX';
    groupRef.current.rotation.set(0, headingRef.current, pitch);
    groupRef.current.scale.setScalar(scale);

    tickRef.current += 1;
    if (tickRef.current % 6 === 0) {
      setGear(curGear);
      setThrust(curThrust);
      setLights(curLights);
    }
  });

  return (
    <group ref={groupRef}>
      <AircraftModel
        variant="a380"
        livery="pacific"
        gearDeploy={gear}
        thrustLevel={thrust}
        landingLights={lights}
        lightingMode={lightingMode}
        quality={quality}
      />
    </group>
  );
}

export const AirTrafficController: React.FC<AirTrafficControllerProps> = ({
  lightingMode,
  quality,
  heroTakeoffPhase,
  heroTrackRef,
}) => {
  const registry = useRef<Record<string, { pos: THREE.Vector3; heading: number; active: boolean }>>({});
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
        p.vx = 1.4 + Math.random() * 2.2;
        p.vy = 0.5 + Math.random() * 1.0;
        p.vz = (Math.random() - 0.5) * 1.6;
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
      {/* 1. South Inner Runway 08L — Arrivals */}
      <SouthArrivalPlane
        lightingMode={lightingMode}
        quality={quality}
        registry={registry}
        heroTrackRef={heroTrackRef}
        onTouchdown={triggerTouchdownSmoke}
      />

      {/* 2. South Outer Runway 08R — Departures (yields during Hero takeoff) */}
      <SouthDeparturePlane
        lightingMode={lightingMode}
        quality={quality}
        yieldForHero={yieldForHero}
        registry={registry}
        heroTrackRef={heroTrackRef}
      />

      {/* 3. North Runway 27R — Westbound Arrivals */}
      <NorthArrivalPlane
        lightingMode={lightingMode}
        quality={quality}
        onTouchdown={triggerTouchdownSmoke}
      />

      {/* 4. East Crosswind Runway 35 — Northbound A380 Superjumbo Departure */}
      <EastCrosswindDeparturePlane lightingMode={lightingMode} quality={quality} />

      {/* Pooled Touchdown Tire Smoke Particles */}
      <instancedMesh ref={smokeMeshRef} args={[undefined, undefined, SMOKE_COUNT]}>
        <sphereGeometry args={[0.7, 10, 10]} />
        <meshStandardMaterial
          color="#f1f5f9"
          transparent
          opacity={quality === 'clay' ? 0.28 : 0.42}
          roughness={1}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
};
