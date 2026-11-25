import React from 'react';
import { PlaneTakeoff } from 'lucide-react';
import { BookingRecord, Destination, FlightMetrics, Seat } from '../types/aviation';
import { QrCodeSvg } from './QrCodeSvg';

interface BoardingPassCardProps {
  destination: Destination;
  metrics: FlightMetrics;
  seat: Seat;
  totalPriceEur: number;
  confirmedBooking?: BookingRecord | null;
  compact?: boolean;
}

export const BoardingPassCard: React.FC<BoardingPassCardProps> = ({
  destination,
  metrics,
  seat,
  totalPriceEur,
  confirmedBooking,
  compact = false,
}) => {
  const qrPayload = confirmedBooking
    ? `M1${confirmedBooking.passengerName}/${confirmedBooking.pnr}/RMO${destination.code}/${destination.flightNumber}/${seat.id}`
    : `PREVIEW/RMO-${destination.code}/${destination.flightNumber}/SEAT-${seat.id}`;

  const classLabel =
    seat.seatClass === 'business'
      ? 'BUSINESS'
      : seat.seatClass === 'legroom'
        ? 'LEGROOM'
        : 'ECONOMY';

  return (
    <div
      className={`rounded-2xl overflow-hidden ${
        confirmedBooking ? 'bento-elevated' : 'bento-sub-strong'
      }`}
    >
      {/* Top Aviation Strip */}
      <div className="px-3.5 py-2 border-b border-slate-400/20 flex items-center justify-between bg-gradient-to-r from-sky-400/15 via-violet-400/10 to-transparent">
        <div className="flex items-center gap-1.5">
          <PlaneTakeoff className="w-3.5 h-3.5 text-sky-500" />
          <span className="font-mono text-[10px] font-bold tracking-wider ink-primary uppercase">
            {confirmedBooking ? `BOARDING PASS · ${confirmedBooking.pnr}` : 'DIGITAL PASS PREVIEW'}
          </span>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bento-sub font-semibold ink-primary">
          {destination.flightNumber}
        </span>
      </div>

      {/* Main Pass Content */}
      <div className="p-3.5 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <div>
              <div className="font-display text-xl font-extrabold ink-primary leading-none">
                RMO
              </div>
              <div className="text-[10px] ink-muted truncate">Chișinău</div>
            </div>

            <div className="flex-1 flex flex-col items-center px-1">
              <span className="font-mono text-[9px] font-semibold text-sky-600 dark:text-sky-300">
                {metrics.durationFormatted}
              </span>
              <div className="w-full h-[2px] rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-emerald-400 relative my-1" />
              <span className="font-mono text-[9px] ink-muted">
                {metrics.distanceKm.toLocaleString()} km
              </span>
            </div>

            <div className="text-right">
              <div className="font-display text-xl font-extrabold ink-primary leading-none">
                {destination.code}
              </div>
              <div className="text-[10px] ink-muted truncate">{destination.city}</div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-dashed border-slate-400/30">
            <div>
              <div className="text-[9px] ink-muted uppercase">Gate</div>
              <div className="font-mono text-xs font-bold ink-primary">{destination.gate}</div>
            </div>
            <div>
              <div className="text-[9px] ink-muted uppercase">Seat</div>
              <div className="font-mono text-xs font-bold text-sky-600 dark:text-sky-300">
                {seat.id}
              </div>
            </div>
            <div>
              <div className="text-[9px] ink-muted uppercase">Class</div>
              <div className="font-mono text-[10px] font-semibold ink-secondary truncate">
                {classLabel}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] ink-muted uppercase">Total</div>
              <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-300">
                €{totalPriceEur}
              </div>
            </div>
          </div>

          {!compact && confirmedBooking && (
            <div className="text-[10px] ink-secondary flex items-center justify-between pt-1">
              <span className="truncate font-medium">PAX: {confirmedBooking.passengerName}</span>
              <span className="font-mono ink-muted">DEP {destination.departureTime}</span>
            </div>
          )}
        </div>

        {/* Deterministic QR Code */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <QrCodeSvg value={qrPayload} size={compact ? 60 : 68} className="shadow-sm border border-slate-200" />
          <span className="font-mono text-[8px] ink-muted tracking-widest">
            {confirmedBooking ? confirmedBooking.pnr : 'PREVIEW'}
          </span>
        </div>
      </div>
    </div>
  );
};
