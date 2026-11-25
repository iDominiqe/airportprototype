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
import { DotMatrixDigits } from './DotMatrixDigits';

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

const TOTAL_TICKS = 36;

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
  const activeIndex = Math.max(
    0,
    SEQUENCE_STEPS.findIndex((s) => s.id === takeoffPhase)
  );
  const isDeparted = takeoffPhase === 'departed';
  const progressRatio = isDeparted ? 1 : (activeIndex + 0.5) / SEQUENCE_STEPS.length;
  const filledTicks = Math.round(progressRatio * TOTAL_TICKS);

  const speedBarPct = Math.min(100, Math.round((telemetry.airspeedKmh / 550) * 100));
  const altBarPct = Math.min(100, Math.round((telemetry.altitudeM / 3500) * 100));

  return (
    <>
      {/* Top-Left Celebratory Banner when Airborne */}
      {isDeparted && (
        <div className="pointer-events-auto fixed top-[72px] left-3 md:left-4 z-30 w-[92vw] max-w-md">
          <div className="bento-elevated aura-hero rounded-[26px] px-4 py-4 border border-white/80 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/45 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-300" />
              </div>
              <div>
                <div className="font-display font-extrabold text-sm sm:text-base tracking-wide">
                  FLIGHT DEPARTED — HAVE A NICE TRIP!
                </div>
                <div className="text-xs opacity-80">
                  {destination.flightNumber} · RMO → {destination.code} ({destination.city}) · Seat {seat.id}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onReplayTakeoff}
                className="flex-1 px-3 py-2 rounded-xl iridescent-cta font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Replay Takeoff
              </button>
              <button
                type="button"
                onClick={onResetBooking}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white font-semibold text-xs transition-all cursor-pointer"
              >
                Book Another Flight
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed Digital Boarding Pass Corner Dock */}
      {showBoardingPass && (
        <div className="pointer-events-auto fixed right-3 md:right-4 top-[72px] z-20 w-[350px] max-w-[calc(100vw-24px)]">
          <BoardingPassCard
            destination={destination}
            metrics={metrics}
            seat={seat}
            totalPriceEur={booking.totalEur}
            confirmedBooking={booking}
          />
        </div>
      )}

      {/* Bottom Metric Telemetry & Segmented Progress Console */}
      <div className="pointer-events-auto fixed bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-3xl bento-card rounded-[26px] p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-500 animate-beacon" />
            <span className="font-mono text-xs font-medium ink-primary">{telemetry.atcCallout}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleBoardingPass}
              className="px-3 py-1 rounded-full bento-sub-strong text-[11px] font-medium ink-primary flex items-center gap-1.5 cursor-pointer hover:opacity-80"
            >
              <Ticket className="w-3.5 h-3.5 text-sky-500" />
              {showBoardingPass ? 'Hide Pass' : 'Boarding Pass'}
            </button>
            {!isDeparted && (
              <button
                type="button"
                onClick={onResetBooking}
                className="px-3 py-1 rounded-full bento-sub text-[11px] font-medium ink-secondary cursor-pointer hover:opacity-80"
              >
                Book Another Flight
              </button>
            )}
          </div>
        </div>

        {/* Segmented Vertical-Tick Progress Bar (Reference Image 6 style) */}
        <div className="flex items-center gap-[3px] h-3.5 px-0.5">
          {Array.from({ length: TOTAL_TICKS }).map((_, idx) => {
            const on = idx < filledTicks;
            const ratio = idx / TOTAL_TICKS;
            const bg = !on
              ? 'rgba(148, 163, 184, 0.25)'
              : ratio < 0.35
                ? '#38bdf8'
                : ratio < 0.7
                  ? '#818cf8'
                  : '#10b981';
            return (
              <span
                key={idx}
                className="flex-1 h-3 rounded-full transition-colors duration-200"
                style={{ backgroundColor: bg }}
              />
            );
          })}
        </div>

        {/* 6 Departure Phase Pills */}
        <div className="grid grid-cols-6 gap-1.5">
          {SEQUENCE_STEPS.map((step, idx) => {
            const done = idx < activeIndex || isDeparted;
            const current = idx === activeIndex && !isDeparted;
            return (
              <div
                key={step.id}
                className={`px-2 py-1 rounded-xl border text-center transition-all ${
                  current
                    ? 'bg-sky-400/20 border-sky-400 ink-primary font-bold'
                    : done
                      ? 'bg-emerald-400/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'bento-sub ink-muted'
                }`}
              >
                <div className="font-mono text-[10px] truncate">{step.label}</div>
              </div>
            );
          })}
        </div>

        {/* Live Metric Readouts: KM/H & M */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
          <div className="bento-sub rounded-2xl p-2 space-y-1">
            <div className="text-[9px] font-mono ink-muted flex items-center gap-1">
              <Gauge className="w-3 h-3 text-sky-500" /> AIRSPEED
            </div>
            <div className="flex items-baseline justify-between">
              <DotMatrixDigits value={telemetry.airspeedKmh} dotSize={2.1} color="currentColor" />
              <span className="font-mono text-[10px] font-bold ink-secondary">KM/H</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-400/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-150"
                style={{ width: `${Math.max(4, speedBarPct)}%` }}
              />
            </div>
          </div>

          <div className="bento-sub rounded-2xl p-2 space-y-1">
            <div className="text-[9px] font-mono ink-muted flex items-center gap-1">
              <PlaneTakeoff className="w-3 h-3 text-emerald-500" /> ALTITUDE
            </div>
            <div className="flex items-baseline justify-between">
              <DotMatrixDigits
                value={telemetry.altitudeM.toLocaleString()}
                dotSize={2.1}
                color="currentColor"
              />
              <span className="font-mono text-[10px] font-bold ink-secondary">M</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-400/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-150"
                style={{ width: `${Math.max(4, altBarPct)}%` }}
              />
            </div>
          </div>

          <div className="bento-sub rounded-2xl p-2 space-y-1">
            <div className="text-[9px] font-mono ink-muted">THRUST N1</div>
            <div className="flex items-baseline justify-between">
              <DotMatrixDigits value={`${telemetry.thrustN1Pct}%`} dotSize={2.1} color="currentColor" />
              <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-300">
                TOGA
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-400/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 transition-all duration-150"
                style={{ width: `${telemetry.thrustN1Pct}%` }}
              />
            </div>
          </div>

          <div className="bento-sub rounded-2xl p-2 flex flex-col justify-between">
            <div className="text-[9px] font-mono ink-muted">LANDING GEAR</div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-extrabold text-sky-600 dark:text-sky-300">
                {telemetry.gearState}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-semibold ${
                  telemetry.gearState === 'UP'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                }`}
              >
                {telemetry.gearState === 'UP' ? 'RETRACTED' : telemetry.gearState === 'DOWN' ? 'LOCKED' : 'CYCLING'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
