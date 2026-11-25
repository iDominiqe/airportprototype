import React, { Component, ReactNode, Suspense, lazy, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CameraPreset, Destination, LightingMode, TakeoffPhase, TelemetryState } from '../types/aviation';
import { GATE_COORDS } from './airportLayout';
import { AirportArchitecture } from './AirportArchitecture';
import { AirTrafficController } from './AirTrafficController';
import { HeroTakeoffAircraft, HeroTrackSnapshot } from './HeroTakeoffAircraft';
import { EnvironmentRig } from './EnvironmentRig';
import { CameraRig } from './CameraRig';

const LazyGlobalRouteGlobe = lazy(() =>
  import('./GlobalRouteGlobe').then((m) => ({ default: m.GlobalRouteGlobe }))
);

interface AirportCanvasProps {
  lightingMode: LightingMode;
  cameraPreset: CameraPreset;
  cameraActionNonce: number;
  selectedDestination: Destination;
  onSelectDestination: (dest: Destination) => void;
  takeoffPhase: TakeoffPhase;
  takeoffRunId: number;
  onPhaseChange: (phase: TakeoffPhase) => void;
  onTelemetryUpdate: (telemetry: TelemetryState) => void;
  onCanvasReady: () => void;
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-200 p-8 text-center">
          <div className="bento-card rounded-2xl p-6 max-w-md">
            <h2 className="font-display text-lg font-bold text-sky-500 mb-2">
              3D Viewport Fallback
            </h2>
            <p className="text-sm text-slate-400">
              WebGL context could not be initialized ({this.state.message}).
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AirportCanvas: React.FC<AirportCanvasProps> = ({
  lightingMode,
  cameraPreset,
  cameraActionNonce,
  selectedDestination,
  onSelectDestination,
  takeoffPhase,
  takeoffRunId,
  onPhaseChange,
  onTelemetryUpdate,
  onCanvasReady,
}) => {
  const heroTrackRef = useRef<HeroTrackSnapshot>({
    position: new THREE.Vector3(GATE_COORDS.G3.x, 0, GATE_COORDS.G3.z),
    heading: Math.PI / 2,
    pitch: 0,
    phase: 'idle',
    elapsed: 0,
  });

  const isGlobe = cameraPreset === 'globe';
  const takeoffActive = takeoffPhase !== 'idle';

  return (
    <CanvasErrorBoundary>
      <div className="w-full h-full absolute inset-0">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [-34, 42, 88], fov: 44, near: 0.5, far: 650 }}
          onCreated={() => {
            onCanvasReady();
          }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: lightingMode === 'night' ? 1.18 : 1.04,
            powerPreference: 'high-performance',
          }}
        >
          <EnvironmentRig lightingMode={lightingMode} cameraPreset={cameraPreset} />

          <CameraRig
            cameraPreset={cameraPreset}
            cameraActionNonce={cameraActionNonce}
            takeoffPhase={takeoffPhase}
            heroTrackRef={heroTrackRef}
            selectedDestination={selectedDestination}
          />

          {!isGlobe ? (
            <group>
              <AirportArchitecture lightingMode={lightingMode} takeoffPhase={takeoffPhase} />
              <AirTrafficController
                lightingMode={lightingMode}
                heroTakeoffPhase={takeoffPhase}
              />
              <HeroTakeoffAircraft
                variant={selectedDestination.aircraftVariant}
                lightingMode={lightingMode}
                takeoffRunId={takeoffRunId}
                takeoffActive={takeoffActive}
                heroTrackRef={heroTrackRef}
                onPhaseChange={onPhaseChange}
                onTelemetryUpdate={onTelemetryUpdate}
              />
            </group>
          ) : (
            <Suspense
              fallback={
                <Html center>
                  <div className="px-4 py-2 rounded-full bg-white/85 backdrop-blur-xl text-slate-900 font-mono text-xs font-semibold shadow-lg">
                    Loading Orbital Globe...
                  </div>
                </Html>
              }
            >
              <LazyGlobalRouteGlobe
                selectedDestination={selectedDestination}
                onSelectDestination={onSelectDestination}
              />
            </Suspense>
          )}
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
};
