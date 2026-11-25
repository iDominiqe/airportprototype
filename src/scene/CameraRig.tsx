import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { CameraPreset, Destination, TakeoffPhase } from '../types/aviation';
import { RUNWAY_SOUTH_DEP_Z } from './airportLayout';
import { HeroTrackSnapshot } from './HeroTakeoffAircraft';

interface CameraRigProps {
  cameraPreset: CameraPreset;
  cameraActionNonce: number;
  takeoffPhase: TakeoffPhase;
  heroTrackRef: React.MutableRefObject<HeroTrackSnapshot>;
  selectedDestination: Destination;
}

const PRESET_VIEWS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  overview: { pos: [-56, 74, 138], target: [8, 2, -6] },
  tower: { pos: [-54, 24, 6], target: [16, 2, 34] },
  departure: { pos: [-114, 11, RUNWAY_SOUTH_DEP_Z + 18], target: [-30, 3, RUNWAY_SOUTH_DEP_Z] },
  globe: { pos: [-12, 16, 40], target: [-4.5, 0, 0] },
};

export const CameraRig: React.FC<CameraRigProps> = ({
  cameraPreset,
  cameraActionNonce,
  takeoffPhase,
  heroTrackRef,
  selectedDestination,
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3(...PRESET_VIEWS.overview.pos));
  const desiredTarget = useRef(new THREE.Vector3(...PRESET_VIEWS.overview.target));
  const transitionFramesRef = useRef(0);
  const userDraggingRef = useRef(false);

  // Trigger smooth transition when user changes camera preset or returns to idle from takeoff
  useEffect(() => {
    const view = PRESET_VIEWS[cameraPreset];
    if (cameraPreset === 'globe') {
      const phi = (90 - Math.max(15, (selectedDestination.lat + 46) * 0.5)) * (Math.PI / 180);
      const theta = ((selectedDestination.lon + 29) * 0.5 + 180) * (Math.PI / 180);
      const r = 40;
      desiredPos.current.set(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) + 4,
        r * Math.sin(phi) * Math.sin(theta)
      );
      desiredTarget.current.set(-4.5, 0, 0);
    } else {
      desiredPos.current.set(...view.pos);
      desiredTarget.current.set(...view.target);
    }
    userDraggingRef.current = false;
    transitionFramesRef.current = 110;
  }, [
    cameraPreset,
    cameraActionNonce,
    takeoffPhase === 'idle',
    selectedDestination.code,
    selectedDestination.lat,
    selectedDestination.lon,
  ]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const isCinematicTakeoff = takeoffPhase !== 'idle' && cameraPreset !== 'globe';

    if (isCinematicTakeoff && !userDraggingRef.current) {
      const snap = heroTrackRef.current;
      const p = snap.position;

      if (snap.phase === 'pushback') {
        desiredPos.current.set(p.x - 16, 8.5, p.z + 18);
        desiredTarget.current.set(p.x, 1.5, p.z);
      } else if (snap.phase === 'taxi') {
        desiredPos.current.set(p.x - 18, 12, p.z + 20);
        desiredTarget.current.set(p.x, 1.5, p.z);
      } else if (snap.phase === 'spool' || snap.phase === 'takeoff_roll') {
        // Dramatic alongside-and-behind wing/tail chase down Runway 08R
        desiredPos.current.set(p.x - 15.5, p.y + 4.4, p.z + 9.2);
        desiredTarget.current.set(p.x + 8, p.y + 1.4, p.z);
      } else if (snap.phase === 'rotate_climb' || snap.phase === 'departed') {
        // Sweeping climbout tracking shot into the clouds
        desiredPos.current.set(p.x - 18, Math.max(4, p.y - 2.2), p.z + 14);
        desiredTarget.current.set(p.x + 6, p.y + 1.5, p.z);
      }

      const speed = Math.min(1, delta * 3.4);
      camera.position.lerp(desiredPos.current, speed);
      controls.target.lerp(desiredTarget.current, speed);
      controls.update();
      return;
    }

    if (transitionFramesRef.current > 0 && !userDraggingRef.current) {
      transitionFramesRef.current -= 1;
      const speed = Math.min(1, delta * 4.2);
      camera.position.lerp(desiredPos.current, speed);
      controls.target.lerp(desiredTarget.current, speed);
      controls.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      maxPolarAngle={cameraPreset === 'globe' ? Math.PI * 0.88 : Math.PI / 2 - 0.03}
      minDistance={cameraPreset === 'globe' ? 23 : 12}
      maxDistance={cameraPreset === 'globe' ? 68 : 260}
      onStart={() => {
        userDraggingRef.current = true;
        transitionFramesRef.current = 0;
      }}
      onEnd={() => {
        userDraggingRef.current = false;
      }}
    />
  );
};
