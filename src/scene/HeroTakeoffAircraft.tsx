import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  AircraftVariant,
  GraphicsQuality,
  LightingMode,
  TakeoffPhase,
  TelemetryState,
} from '../types/aviation';
import {
  APRON_TAXI_Z,
  createSmoothPath,
  GATE_COORDS,
  RUNWAY_SOUTH_DEP_Z,
  WEST_ENTRY_X,
} from './airportLayout';
import { AircraftModel } from './AircraftModel';

export interface HeroTrackSnapshot {
  position: THREE.Vector3;
  heading: number;
  pitch: number;
  phase: TakeoffPhase;
  elapsed: number;
}

interface HeroTakeoffAircraftProps {
  variant: AircraftVariant;
  lightingMode: LightingMode;
  quality: GraphicsQuality;
  takeoffRunId: number;
  takeoffActive: boolean;
  heroTrackRef: React.MutableRefObject<HeroTrackSnapshot>;
  onPhaseChange: (phase: TakeoffPhase) => void;
  onTelemetryUpdate: (telemetry: TelemetryState) => void;
}

const GATE_G3 = GATE_COORDS.G3; // { x: -8, z: 6.5 }

function lerpAngle(current: number, target: number, alpha: number): number {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * alpha;
}

export const HeroTakeoffAircraft: React.FC<HeroTakeoffAircraftProps> = ({
  variant,
  lightingMode,
  quality,
  takeoffRunId,
  takeoffActive,
  heroTrackRef,
  onPhaseChange,
  onTelemetryUpdate,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastPhaseRef = useRef<TakeoffPhase>('idle');
  const lastUiPushRef = useRef(0);
  const headingRef = useRef(Math.PI / 2);

  const [gearDeploy, setGearDeploy] = useState(1);
  const [thrustLevel, setThrustLevel] = useState(0.08);
  const [landingLights, setLandingLights] = useState(false);

  // Smooth rounded taxiway spline from pushback end -> apron taxiway -> West Entry -> 08R
  const taxiSpline = useMemo(
    () =>
      createSmoothPath([
        [GATE_G3.x - 5, 0, APRON_TAXI_Z],
        [-45, 0, APRON_TAXI_Z],
        [WEST_ENTRY_X + 6, 0, APRON_TAXI_Z],
        [WEST_ENTRY_X, 0, APRON_TAXI_Z + 8],
        [WEST_ENTRY_X, 0, RUNWAY_SOUTH_DEP_Z - 9],
        [WEST_ENTRY_X + 7, 0, RUNWAY_SOUTH_DEP_Z],
        [-76, 0, RUNWAY_SOUTH_DEP_Z],
      ]),
    []
  );

  useEffect(() => {
    startTimeRef.current = null;
    headingRef.current = Math.PI / 2;
    lastPhaseRef.current = takeoffActive ? 'pushback' : 'idle';
    if (!takeoffActive) {
      setGearDeploy(1);
      setThrustLevel(0.08);
      setLandingLights(false);
      heroTrackRef.current.position.set(GATE_G3.x, 0, GATE_G3.z);
      heroTrackRef.current.heading = Math.PI / 2;
      heroTrackRef.current.pitch = 0;
      heroTrackRef.current.phase = 'idle';
      heroTrackRef.current.elapsed = 0;
    }
  }, [takeoffRunId, takeoffActive, heroTrackRef]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(0.05, delta);

    if (!takeoffActive) {
      groupRef.current.position.set(GATE_G3.x, 0, GATE_G3.z);
      groupRef.current.rotation.order = 'YZX';
      groupRef.current.rotation.set(0, Math.PI / 2, 0);
      groupRef.current.scale.setScalar(1);
      return;
    }

    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const t = state.clock.elapsedTime - startTimeRef.current;

    let x = GATE_G3.x;
    let y = 0;
    let z = GATE_G3.z;
    let targetHeading = Math.PI / 2;
    let pitch = 0;
    let bank = 0;
    let phase: TakeoffPhase = 'pushback';
    let curGear = 1;
    let curThrust = 0.2;
    let curLights = false;
    let airspeedKmh = 0;
    let altitudeM = 0;
    let atcCallout = 'RMO Ground: Tug connected, pushback approved Gate G3.';

    if (t < 5.5) {
      // 0 -> 5.5s: Calm pushback from Gate G3 (+Z) onto South Apron Taxiway facing West
      const u = t / 5.5;
      const smooth = u * u * (3 - 2 * u);
      x = THREE.MathUtils.lerp(GATE_G3.x, GATE_G3.x - 5, smooth);
      z = THREE.MathUtils.lerp(GATE_G3.z, APRON_TAXI_Z, smooth);
      targetHeading = THREE.MathUtils.lerp(Math.PI / 2, Math.PI, smooth);
      phase = 'pushback';
      curThrust = 0.16;
      airspeedKmh = Math.round(smooth * 10);
      atcCallout = 'RMO Ground: Cleared pushback Gate G3, facing West on Apron Alpha.';
    } else if (t < 17.5) {
      // 5.5 -> 17.5s: Calm ~32 KM/H spline taxi around West Entry onto South Outer 08R
      const u = (t - 5.5) / 12.0;
      const pt = taxiSpline.getPointAt(u);
      const tan = taxiSpline.getTangentAt(u);
      x = pt.x;
      z = pt.z;
      targetHeading = Math.atan2(-tan.z, tan.x);
      phase = 'taxi';
      curThrust = 0.24;
      curLights = u > 0.85;
      airspeedKmh = 32;
      atcCallout = 'RMO Tower: Taxi via Alpha & Whiskey-1, line up Runway 08R.';
    } else if (t < 20.5) {
      // 17.5 -> 20.5s: Hold brakes & spool up engines to TOGA thrust
      const u = (t - 17.5) / 3.0;
      phase = 'spool';
      x = -76;
      z = RUNWAY_SOUTH_DEP_Z;
      targetHeading = 0;
      curThrust = THREE.MathUtils.lerp(0.28, 1.0, u);
      curLights = true;
      airspeedKmh = Math.round(u * 14);
      atcCallout = 'RMO Tower: Winds 080° at 14 km/h, Runway 08R cleared for takeoff.';
    } else if (t < 27.0) {
      // 20.5 -> 27.0s: Progressive heavy-jet acceleration down 08R to V2
      const u = (t - 20.5) / 6.5;
      phase = 'takeoff_roll';
      x = THREE.MathUtils.lerp(-76, 30, u * u);
      z = RUNWAY_SOUTH_DEP_Z;
      targetHeading = 0;
      pitch = u > 0.84 ? THREE.MathUtils.lerp(0, 0.24, (u - 0.84) / 0.16) : 0;
      y = u > 0.9 ? THREE.MathUtils.lerp(0, 0.9, (u - 0.9) / 0.1) : 0;
      curThrust = 1.0;
      curLights = true;
      airspeedKmh = Math.round(THREE.MathUtils.lerp(18, 298, u));
      altitudeM = Math.round(y * 40);
      atcCallout = u < 0.55 ? 'Crew: Thrust set, 150 km/h checked.' : 'Crew: V1 (270 km/h)... Rotate!';
    } else if (t < 35.0) {
      // 27.0 -> 35.0s: Positive climb, gear up, climb smoothly into sky
      const u = (t - 27.0) / 8.0;
      phase = 'rotate_climb';
      x = THREE.MathUtils.lerp(30, 198, u);
      y = THREE.MathUtils.lerp(0.9, 44, Math.pow(u, 1.15));
      z = RUNWAY_SOUTH_DEP_Z + Math.pow(Math.max(0, u - 0.3), 1.5) * 20;
      pitch = THREE.MathUtils.lerp(0.24, 0.15, u);
      bank = u > 0.35 && u < 0.9 ? 0.13 * Math.sin(((u - 0.35) / 0.55) * Math.PI) : 0;
      targetHeading = -Math.pow(Math.max(0, u - 0.3), 1.4) * 0.22;
      curGear = t < 28.4 ? 1 : t > 31.4 ? 0 : 1 - (t - 28.4) / 3.0;
      curThrust = 0.96;
      curLights = t < 32.0;
      airspeedKmh = Math.round(THREE.MathUtils.lerp(298, 462, u));
      altitudeM = Math.round(y * 42);
      atcCallout =
        t < 31.2
          ? 'Crew: Positive rate — Gear Up!'
          : 'RMO Departure: Radar contact, climb and maintain 5,500 m.';
    } else {
      // 35.0s+: Departed — steady cruise climb
      const extra = Math.min(25, t - 35.0);
      phase = 'departed';
      x = 198 + extra * 9.5;
      y = 44 + extra * 1.45;
      z = RUNWAY_SOUTH_DEP_Z + 11.7 + extra * 2.2;
      pitch = 0.12;
      targetHeading = -0.14;
      curGear = 0;
      curThrust = 0.88;
      curLights = false;
      airspeedKmh = Math.round(466 + extra * 6.5);
      altitudeM = Math.round(y * 42);
      atcCallout = 'FLIGHT DEPARTED — HAVE A NICE TRIP!';
    }

    headingRef.current = lerpAngle(headingRef.current, targetHeading, dt * 6);
    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.order = 'YZX';
    groupRef.current.rotation.set(bank, headingRef.current, pitch);

    heroTrackRef.current.position.set(x, y, z);
    heroTrackRef.current.heading = headingRef.current;
    heroTrackRef.current.pitch = pitch;
    heroTrackRef.current.phase = phase;
    heroTrackRef.current.elapsed = t;

    if (phase !== lastPhaseRef.current) {
      lastPhaseRef.current = phase;
      onPhaseChange(phase);
    }

    if (state.clock.elapsedTime - lastUiPushRef.current > 0.1) {
      lastUiPushRef.current = state.clock.elapsedTime;
      setGearDeploy(curGear);
      setThrustLevel(curThrust);
      setLandingLights(curLights);
      onTelemetryUpdate({
        phase,
        airspeedKmh,
        altitudeM,
        thrustN1Pct: Math.round(22 + curThrust * 76),
        gearState: curGear > 0.92 ? 'DOWN' : curGear < 0.08 ? 'UP' : 'TRANSIT',
        elapsedSec: Math.round(t),
        atcCallout,
      });
    }
  });

  return (
    <group ref={groupRef}>
      <AircraftModel
        variant={variant}
        livery="nova"
        gearDeploy={gearDeploy}
        thrustLevel={thrustLevel}
        landingLights={landingLights}
        lightingMode={lightingMode}
        quality={quality}
      />
    </group>
  );
};
