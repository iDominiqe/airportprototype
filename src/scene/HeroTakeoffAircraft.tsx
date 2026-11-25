import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AircraftVariant, LightingMode, TakeoffPhase, TelemetryState } from '../types/aviation';
import { APRON_TAXI_Z, GATE_COORDS, RUNWAY_RIGHT_Z, WEST_ENTRY_X } from './airportLayout';
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
  takeoffRunId: number;
  takeoffActive: boolean;
  heroTrackRef: React.MutableRefObject<HeroTrackSnapshot>;
  onPhaseChange: (phase: TakeoffPhase) => void;
  onTelemetryUpdate: (telemetry: TelemetryState) => void;
}

const GATE_G3 = GATE_COORDS.G3; // { x: -7.2, z: -15.8 }

export const HeroTakeoffAircraft: React.FC<HeroTakeoffAircraftProps> = ({
  variant,
  lightingMode,
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

  const [gearDeploy, setGearDeploy] = useState(1);
  const [thrustLevel, setThrustLevel] = useState(0.08);
  const [landingLights, setLandingLights] = useState(false);

  // Reset clock whenever a new takeoff run starts or resets to idle
  useEffect(() => {
    startTimeRef.current = null;
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

  useFrame((state) => {
    if (!groupRef.current) return;

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
    let heading = Math.PI / 2;
    let pitch = 0;
    let bank = 0;
    let phase: TakeoffPhase = 'pushback';
    let curGear = 1;
    let curThrust = 0.2;
    let curLights = false;
    let airspeedKts = 0;
    let altitudeFt = 0;
    let atcCallout = 'RMO Ground: Tug connected, pushback approved Gate G3.';

    if (t < 4.5) {
      // 0 -> 4.5s: Pushback from Gate G3 onto apron taxiway facing West
      const u = t / 4.5;
      const smooth = u * u * (3 - 2 * u);
      x = THREE.MathUtils.lerp(GATE_G3.x, GATE_G3.x - 4.5, smooth);
      z = THREE.MathUtils.lerp(GATE_G3.z, APRON_TAXI_Z, smooth);
      heading = THREE.MathUtils.lerp(Math.PI / 2, Math.PI, smooth);
      phase = 'pushback';
      curThrust = 0.18;
      airspeedKts = Math.round(smooth * 6);
      atcCallout = 'RMO Ground: Cleared pushback Gate G3, facing West on Apron Alpha.';
    } else if (t < 11.5) {
      // 4.5 -> 11.5s: Taxi West to West Entry, turn South to 08R, line up East
      const u = (t - 4.5) / 7.0;
      phase = 'taxi';
      curThrust = 0.28;
      airspeedKts = 18;
      atcCallout = 'RMO Tower: Taxi via Alpha & Whiskey-1, line up Runway 08R.';
      if (u < 0.48) {
        const s = u / 0.48;
        x = THREE.MathUtils.lerp(GATE_G3.x - 4.5, WEST_ENTRY_X, s);
        z = APRON_TAXI_Z;
        heading = s > 0.85 ? THREE.MathUtils.lerp(Math.PI, Math.PI * 1.5, (s - 0.85) / 0.15) : Math.PI;
      } else if (u < 0.84) {
        const s = (u - 0.48) / 0.36;
        x = WEST_ENTRY_X;
        z = THREE.MathUtils.lerp(APRON_TAXI_Z, RUNWAY_RIGHT_Z, s);
        heading = s > 0.82 ? THREE.MathUtils.lerp(-Math.PI / 2, 0, (s - 0.82) / 0.18) : -Math.PI / 2;
      } else {
        const s = (u - 0.84) / 0.16;
        x = THREE.MathUtils.lerp(WEST_ENTRY_X, -74, s);
        z = RUNWAY_RIGHT_Z;
        heading = 0;
        curLights = true;
      }
    } else if (t < 14.0) {
      // 11.5 -> 14.0s: Hold brakes & spool up engines to TOGA thrust
      const u = (t - 11.5) / 2.5;
      phase = 'spool';
      x = -74;
      z = RUNWAY_RIGHT_Z;
      heading = 0;
      curThrust = THREE.MathUtils.lerp(0.32, 1.0, u);
      curLights = true;
      airspeedKts = Math.round(u * 8);
      atcCallout = 'RMO Tower: Winds 080° at 7 kts, Runway 08R cleared for takeoff.';
    } else if (t < 19.5) {
      // 14.0 -> 19.5s: Accelerate down Runway 08R to V2
      const u = (t - 14.0) / 5.5;
      phase = 'takeoff_roll';
      x = THREE.MathUtils.lerp(-74, 24, u * u);
      z = RUNWAY_RIGHT_Z;
      heading = 0;
      pitch = u > 0.84 ? THREE.MathUtils.lerp(0, 0.25, (u - 0.84) / 0.16) : 0;
      y = u > 0.9 ? THREE.MathUtils.lerp(0, 0.9, (u - 0.9) / 0.1) : 0;
      curThrust = 1.0;
      curLights = true;
      airspeedKts = Math.round(THREE.MathUtils.lerp(12, 162, u));
      altitudeFt = Math.round(y * 120);
      atcCallout = u < 0.55 ? 'Crew: Thrust set, 80 knots checked.' : 'Crew: V1... Rotate!';
    } else if (t < 27.5) {
      // 19.5 -> 27.5s: Positive climb, gear up, climb smoothly into the clouds
      const u = (t - 19.5) / 8.0;
      phase = 'rotate_climb';
      x = THREE.MathUtils.lerp(24, 195, u);
      y = THREE.MathUtils.lerp(0.9, 44, Math.pow(u, 1.15));
      z = RUNWAY_RIGHT_Z + Math.pow(Math.max(0, u - 0.3), 1.5) * 20;
      pitch = THREE.MathUtils.lerp(0.25, 0.16, u);
      bank = u > 0.35 && u < 0.9 ? 0.14 * Math.sin(((u - 0.35) / 0.55) * Math.PI) : 0;
      heading = -Math.pow(Math.max(0, u - 0.3), 1.4) * 0.22;
      curGear = t < 20.8 ? 1 : t > 23.6 ? 0 : 1 - (t - 20.8) / 2.8;
      curThrust = 0.96;
      curLights = t < 24.5;
      airspeedKts = Math.round(THREE.MathUtils.lerp(162, 248, u));
      altitudeFt = Math.round(y * 135);
      atcCallout =
        t < 23.5
          ? 'Crew: Positive rate — Gear Up!'
          : 'RMO Departure: Radar contact, climb and maintain FL180.';
    } else {
      // 27.5s+: Departed — graceful steady cruise climb
      const extra = Math.min(25, t - 27.5);
      phase = 'departed';
      x = 195 + extra * 9.5;
      y = 44 + extra * 1.45;
      z = RUNWAY_RIGHT_Z + 11.7 + extra * 2.2;
      pitch = 0.12;
      heading = -0.14;
      curGear = 0;
      curThrust = 0.88;
      curLights = false;
      airspeedKts = Math.round(250 + extra * 3.5);
      altitudeFt = Math.round(y * 135);
      atcCallout = 'FLIGHT DEPARTED — HAVE A NICE TRIP!';
    }

    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.order = 'YZX';
    groupRef.current.rotation.set(bank, heading, pitch);

    heroTrackRef.current.position.set(x, y, z);
    heroTrackRef.current.heading = heading;
    heroTrackRef.current.pitch = pitch;
    heroTrackRef.current.phase = phase;
    heroTrackRef.current.elapsed = t;

    if (phase !== lastPhaseRef.current) {
      lastPhaseRef.current = phase;
      onPhaseChange(phase);
    }

    // Throttle React state updates cleanly to ~10 Hz
    if (state.clock.elapsedTime - lastUiPushRef.current > 0.1) {
      lastUiPushRef.current = state.clock.elapsedTime;
      setGearDeploy(curGear);
      setThrustLevel(curThrust);
      setLandingLights(curLights);
      onTelemetryUpdate({
        phase,
        airspeedKts,
        altitudeFt,
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
      />
    </group>
  );
};
