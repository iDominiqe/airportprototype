import React from 'react';
import {
  CheckCircle2,
  Gauge,
  PlaneTakeoff,
  Radio,
  RotateCcw,
  Ticket,
} from 'lucide-react';
import {
  BookingRecord,
  Destination,
  FlightMetrics,
  Seat,
  TakeoffPhase,
  TelemetryState,
} from '../types/aviation';
import { BoardingPassCard } from './BoardingPassCard';

interface TakeoffHUDProps {
  destination: Destination;
  metrics: FlightMetrics;
  seat: Seat;
  booking: BookingRecord;
  takeoffPhase: TakeoffPhase;
  telemetry: TelemetryState;
  showBoardingPass: boolean;
  onToggleBoardingPass: () => void;
  onReplayTakeoff: () => void;
  onResetBooking: () => void;
}

const SEQUENCE_STEPS: Array<{ id: TakeoffPhase; label: string }> = [
  { id: 'pushback', label: 'Pushback' },
  { id: 'taxi', label: 'Taxi 08R' },
  { id: 'spool', label: 'Spool Up' },
  { id: 'takeoff_roll', label: 'Takeoff Roll' },
  { id: 'rotate_climb', label: 'V2 Climb' },
  { id: 'departed', label: 'Airborne' },
];

export const TakeoffHUD: React.FC<TakeoffHUDProps> = ({
  destination,
  metrics,
  seat,
  booking,
  takeoffPhase,
  telemetry,
  showBoardingPass,
  onToggleBoardingPass,
  onReplayTakeoff,
  onResetBooking,
}) => {
  const activeIndex = SEQUENCE_STEPS.findIndex((s) => s.id === takeoffPhase);
  const isDeparted = takeoffPhase === 'departed';

  return (
    <>
      {/* Top-Left Celebratory Banner when Airborne (never overlaps Top Bar or Right Boarding Pass) */}
      {isDeparted && (
        <div className="pointer-events-auto fixed top-20 left-3 md:left-4 z-30 w-[92vw] max-w-md">
          <div className="glass-elevated rounded-3xl px-4 py-3.5 border border-emerald-400/50 shadow-2xl shadow-emerald-500/20 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-400/20 border border-emerald-400/50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <div className="font-display font-extrabold text-sm sm:text-base tracking-wide text-emerald-300">
                  FLIGHT DEPARTED — HAVE A NICE TRIP!
                </div>
                <div className="text-xs text-slate-300">
                  {destination.flightNumber} · RMO → {destination.code} ({destination.city}) · Seat {seat.id}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onReplayTakeoff}
                className="flex-1 px-3 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Replay Takeoff
              </button>
              <button
                type="button"
                onClick={onResetBooking}
                className="flex-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all cursor-pointer"
              >
                Book Another Flight
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed Digital Boarding Pass Corner Dock */}
      {showBoardingPass && (
        <div className="pointer-events-auto fixed right-3 md:right-4 top-20 z-20 w-[350px] max-w-[calc(100vw-24px)]">
          <BoardingPassCard
            destination={destination}
            metrics={metrics}
            seat={seat}
            totalPriceEur={booking.totalEur}
            confirmedBooking={booking}
          />
        </div>
      )}

      {/* Bottom Live Flight Telemetry & Sequence Stepper */}
      <div className="pointer-events-auto fixed bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-3xl glass-panel rounded-3xl p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400 animate-beacon" />
            <span className="font-mono text-xs text-sky-200">{telemetry.atcCallout}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleBoardingPass}
              className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 text-[11px] font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5 text-sky-300" />
              {showBoardingPass ? 'Hide Pass' : 'Boarding Pass'}
            </button>
            {!isDeparted && (
              <button
                type="button"
                onClick={onResetBooking}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-medium text-slate-200 cursor-pointer"
              >
                Book Another Flight
              </button>
            )}
          </div>
        </div>

        {/* Sequence Progress Stepper */}
        <div className="grid grid-cols-6 gap-1.5">
          {SEQUENCE_STEPS.map((step, idx) => {
            const done = idx < activeIndex || isDeparted;
            const current = idx === activeIndex && !isDeparted;
            return (
              <div
                key={step.id}
                className={`px-2 py-1.5 rounded-xl border text-center transition-all ${
                  current
                    ? 'bg-sky-400/25 border-sky-400 text-sky-200 font-semibold'
                    : done
                      ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-300'
                      : 'bg-slate-900/50 border-slate-700/50 text-slate-500'
                }`}
              >
                <div className="font-mono text-[10px] truncate">{step.label}</div>
              </div>
            );
          })}
        </div>

        {/* Live Telemetry Readouts */}
        <div className="grid grid-cols-4 gap-2 pt-1 text-center">
          <div className="bg-slate-950/60 rounded-xl py-1.5 px-2 border border-slate-800/80">
            <div className="text-[9px] font-mono text-slate-400 flex items-center justify-center gap-1">
              <Gauge className="w-3 h-3 text-sky-400" /> AIRSPEED
            </div>
            <div className="font-mono text-xs font-bold text-white">
              {telemetry.airspeedKts} KTS
            </div>
          </div>
          <div className="bg-slate-950/60 rounded-xl py-1.5 px-2 border border-slate-800/80">
            <div className="text-[9px] font-mono text-slate-400 flex items-center justify-center gap-1">
              <PlaneTakeoff className="w-3 h-3 text-emerald-400" /> ALTITUDE
            </div>
            <div className="font-mono text-xs font-bold text-white">
              {telemetry.altitudeFt.toLocaleString()} FT
            </div>
          </div>
          <div className="bg-slate-950/60 rounded-xl py-1.5 px-2 border border-slate-800/80">
            <div className="text-[9px] font-mono text-slate-400">THRUST N1</div>
            <div className="font-mono text-xs font-bold text-amber-300">
              {telemetry.thrustN1Pct}%
            </div>
          </div>
          <div className="bg-slate-950/60 rounded-xl py-1.5 px-2 border border-slate-800/80">
            <div className="text-[9px] font-mono text-slate-400">GEAR</div>
            <div className="font-mono text-xs font-bold text-sky-300">
              {telemetry.gearState}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
