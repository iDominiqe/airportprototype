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

const INITIAL_TELEMETRY: TelemetryState = {
  phase: 'idle',
  airspeedKts: 0,
  altitudeFt: 0,
  thrustN1Pct: 24,
  gearState: 'DOWN',
  elapsedSec: 0,
  atcCallout: 'Standby at Gate G3 — Ready for boarding.',
};

export const App: React.FC = () => {
  const [lightingMode, setLightingMode] = useState<LightingMode>('day');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [cameraActionNonce, setCameraActionNonce] = useState(0);
  const [hudCollapsed, setHudCollapsed] = useState(false);

  const [selectedDestination, setSelectedDestination] = useState<Destination>(DESTINATIONS[5]); // Dubai DXB default showcase (787)
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
      />

      {/* Top Glassmorphism Aviation Header */}
      <TopHeaderBar
        cameraPreset={cameraPreset}
        onSelectCamera={handleSelectCamera}
        lightingMode={lightingMode}
        onSelectLighting={setLightingMode}
        hudCollapsed={hudCollapsed}
        onToggleHud={() => setHudCollapsed((v) => !v)}
        takeoffPhase={takeoffPhase}
      />

      {/* Booking Dock (Visible in Idle Mode unless collapsed) */}
      {takeoffPhase === 'idle' && !hudCollapsed && (
        <BookingPanel
          selectedDestination={selectedDestination}
          onSelectDestination={handleSelectDestination}
          metrics={metrics}
          seats={seats}
          selectedSeat={selectedSeat}
          onSelectSeat={(s) => setSelectedSeatId(s.id)}
          totalPriceEur={totalPriceEur}
          onOpenGlobe={() => setCameraPreset('globe')}
          onProceedToPayment={() => setCheckoutOpen(true)}
        />
      )}

      {/* Dual-Runway Live Ops Pill (Bottom Right in Idle Mode) */}
      {takeoffPhase === 'idle' && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-20 hidden md:flex items-center gap-3 glass-panel rounded-2xl px-3.5 py-2 text-[11px] font-mono text-slate-200">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>RWY 08L: ARRIVALS</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>RWY 08R: DEPARTURES</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Drag to orbit · Scroll to zoom</span>
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
