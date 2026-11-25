import React, { useMemo, useState } from 'react';
import { calculateFlightMetrics, DESTINATIONS } from './data/flights';
import { generateSeatsForDestination, getDefaultSeat } from './data/seats';
import {
  BookingRecord,
  CameraPreset,
  Destination,
  LightingMode,
  Seat,
  TakeoffPhase,
  TelemetryState,
} from './types/aviation';
import { AirportCanvas } from './scene/AirportCanvas';
import { TopHeaderBar } from './components/TopHeaderBar';
import { BookingPanel } from './components/BookingPanel';
import { CheckoutModal } from './components/CheckoutModal';
import { TakeoffHUD } from './components/TakeoffHUD';
import { SceneLoader } from './components/SceneLoader';
import { useScenePreloader } from './hooks/useScenePreloader';

const INITIAL_TELEMETRY: TelemetryState = {
  phase: 'idle',
  airspeedKmh: 0,
  altitudeM: 0,
  thrustN1Pct: 24,
  gearState: 'DOWN',
  elapsedSec: 0,
  atcCallout: 'Standby at Gate G3 — Ready for boarding.',
};

export const App: React.FC = () => {
  const { stages, progress, sceneReady, markCanvasCreated } = useScenePreloader();

  const [lightingMode, setLightingMode] = useState<LightingMode>('day');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [cameraActionNonce, setCameraActionNonce] = useState(0);
  const [hudCollapsed, setHudCollapsed] = useState(false);

  // Default to Dubai DXB (Airbus A350-900 XWB)
  const [selectedDestination, setSelectedDestination] = useState<Destination>(DESTINATIONS[5]);
  const seats = useMemo(
    () => generateSeatsForDestination(selectedDestination),
    [selectedDestination]
  );
  const [selectedSeatId, setSelectedSeatId] = useState<string>('12A');

  const selectedSeat: Seat = useMemo(() => {
    const found = seats.find((s) => s.id === selectedSeatId && !s.occupied);
    return found || getDefaultSeat(seats);
  }, [seats, selectedSeatId]);

  const metrics = useMemo(
    () => calculateFlightMetrics(selectedDestination),
    [selectedDestination]
  );

  const totalPriceEur =
    selectedDestination.baseFareEur + selectedSeat.feeEur + metrics.airportTaxEur;

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);
  const [takeoffPhase, setTakeoffPhase] = useState<TakeoffPhase>('idle');
  const [takeoffRunId, setTakeoffRunId] = useState(0);
  const [telemetry, setTelemetry] = useState<TelemetryState>(INITIAL_TELEMETRY);
  const [showBoardingPass, setShowBoardingPass] = useState(true);

  const handleSelectDestination = (dest: Destination) => {
    setSelectedDestination(dest);
    const nextSeats = generateSeatsForDestination(dest);
    const def = getDefaultSeat(nextSeats);
    setSelectedSeatId(def.id);
  };

  const handleSelectCamera = (preset: CameraPreset) => {
    setCameraPreset(preset);
    setCameraActionNonce((n) => n + 1);
  };

  const handleConfirmPayment = (booking: BookingRecord) => {
    setConfirmedBooking(booking);
    setCheckoutOpen(false);
    setShowBoardingPass(true);
    setCameraPreset('overview');
    setTakeoffPhase('pushback');
    setTakeoffRunId((n) => n + 1);
  };

  const handleReplayTakeoff = () => {
    setCameraPreset('overview');
    setCameraActionNonce((n) => n + 1);
    setTakeoffPhase('pushback');
    setTelemetry(INITIAL_TELEMETRY);
    setTakeoffRunId((n) => n + 1);
  };

  const handleResetBooking = () => {
    setTakeoffPhase('idle');
    setConfirmedBooking(null);
    setTelemetry(INITIAL_TELEMETRY);
    setCameraPreset('overview');
    setCameraActionNonce((n) => n + 1);
    setHudCollapsed(false);
  };

  return (
    <div
      data-lighting={lightingMode}
      className="relative w-screen h-screen overflow-hidden bg-slate-950"
    >
      {/* Staged 3D Preloader Splash */}
      <SceneLoader stages={stages} progress={progress} sceneReady={sceneReady} />

      {/* Full-Bleed Interactive 3D Airport & Globe Viewport */}
      <AirportCanvas
        lightingMode={lightingMode}
        cameraPreset={cameraPreset}
        cameraActionNonce={cameraActionNonce}
        selectedDestination={selectedDestination}
        onSelectDestination={handleSelectDestination}
        takeoffPhase={takeoffPhase}
        takeoffRunId={takeoffRunId}
        onPhaseChange={setTakeoffPhase}
        onTelemetryUpdate={setTelemetry}
        onCanvasReady={markCanvasCreated}
      />

      {/* Top Ceramic Bento Aviation Header */}
      <TopHeaderBar
        cameraPreset={cameraPreset}
        onSelectCamera={handleSelectCamera}
        lightingMode={lightingMode}
        onSelectLighting={setLightingMode}
        hudCollapsed={hudCollapsed}
        onToggleHud={() => setHudCollapsed((v) => !v)}
        takeoffPhase={takeoffPhase}
      />

      {/* Left Bento Booking Dock */}
      {takeoffPhase === 'idle' && !hudCollapsed && (
        <BookingPanel
          selectedDestination={selectedDestination}
          onSelectDestination={handleSelectDestination}
          metrics={metrics}
          seats={seats}
          selectedSeat={selectedSeat}
          onSelectSeat={(s) => setSelectedSeatId(s.id)}
          totalPriceEur={totalPriceEur}
          onOpenGlobe={() => handleSelectCamera('globe')}
          onProceedToPayment={() => setCheckoutOpen(true)}
        />
      )}

      {/* Dual-Runway Live Ops Pill (Bottom Right in Idle Mode) */}
      {takeoffPhase === 'idle' && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-20 hidden md:flex items-center gap-3 bento-card rounded-full px-4 py-2 text-[11px] font-mono ink-primary">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>RWY 08L: ARR</span>
          </div>
          <span className="opacity-30">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>RWY 08R: DEP</span>
          </div>
          <span className="opacity-30">|</span>
          <span className="ink-muted">Drag to orbit · Scroll to zoom</span>
        </div>
      )}

      {/* Post-Purchase Cinematic Takeoff Telemetry & Boarding Pass HUD */}
      {takeoffPhase !== 'idle' && confirmedBooking && (
        <TakeoffHUD
          destination={selectedDestination}
          metrics={metrics}
          seat={selectedSeat}
          booking={confirmedBooking}
          takeoffPhase={takeoffPhase}
          telemetry={telemetry}
          showBoardingPass={showBoardingPass}
          onToggleBoardingPass={() => setShowBoardingPass((v) => !v)}
          onReplayTakeoff={handleReplayTakeoff}
          onResetBooking={handleResetBooking}
        />
      )}

      {/* Simulated Payment & Instant Boarding Pass Generation Modal */}
      <CheckoutModal
        open={checkoutOpen}
        destination={selectedDestination}
        metrics={metrics}
        seat={selectedSeat}
        totalPriceEur={totalPriceEur}
        onClose={() => setCheckoutOpen(false)}
        onConfirmPayment={handleConfirmPayment}
      />
    </div>
  );
};

export default App;
