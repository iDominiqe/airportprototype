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
        ? 'EXTRA LEGROOM'
        : 'ECONOMY';

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-sky-400/25 overflow-hidden shadow-xl">
      {/* Top Aviation Strip */}
      <div className="px-3.5 py-2 bg-gradient-to-r from-sky-500/20 via-blue-500/10 to-transparent border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PlaneTakeoff className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-mono text-[10px] font-bold tracking-wider text-sky-300 uppercase">
            {confirmedBooking ? `CONFIRMED · PNR ${confirmedBooking.pnr}` : 'LIVE BOARDING PASS PREVIEW'}
          </span>
        </div>
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-200">
          {destination.flightNumber}
        </span>
      </div>

      {/* Main Pass Content */}
      <div className="p-3.5 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Route Row */}
          <div className="flex items-center gap-2">
            <div>
              <div className="font-display text-xl font-extrabold text-white leading-none">
                RMO
              </div>
              <div className="text-[10px] text-slate-400 truncate">Chișinău</div>
            </div>

            <div className="flex-1 flex flex-col items-center px-1">
              <span className="font-mono text-[9px] text-sky-300">
                {metrics.durationFormatted}
              </span>
              <div className="w-full h-[1px] bg-gradient-to-r from-sky-400/30 via-sky-400 to-amber-400/40 relative my-1">
                <span className="absolute right-0 -top-[3px] w-1.5 h-1.5 rounded-full bg-amber-400" />
              </div>
              <span className="font-mono text-[9px] text-slate-400">
                {metrics.distanceKm.toLocaleString()} km
              </span>
            </div>

            <div className="text-right">
              <div className="font-display text-xl font-extrabold text-amber-300 leading-none">
                {destination.code}
              </div>
              <div className="text-[10px] text-slate-400 truncate">{destination.city}</div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-dashed border-slate-700/70">
            <div>
              <div className="text-[9px] text-slate-400 uppercase">Gate</div>
              <div className="font-mono text-xs font-bold text-white">{destination.gate}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 uppercase">Seat</div>
              <div className="font-mono text-xs font-bold text-sky-300">{seat.id}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 uppercase">Class</div>
              <div className="font-mono text-[10px] font-semibold text-slate-200 truncate">
                {classLabel}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-slate-400 uppercase">Total</div>
              <div className="font-mono text-xs font-bold text-emerald-300">€{totalPriceEur}</div>
            </div>
          </div>

          {!compact && confirmedBooking && (
            <div className="text-[10px] text-slate-300 flex items-center justify-between pt-1">
              <span className="truncate">PAX: {confirmedBooking.passengerName}</span>
              <span className="font-mono text-slate-400">DEP {destination.departureTime}</span>
            </div>
          )}
        </div>

        {/* Deterministic QR Code */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <QrCodeSvg value={qrPayload} size={compact ? 62 : 70} />
          <span className="font-mono text-[8px] text-slate-400 tracking-widest">
            {confirmedBooking ? confirmedBooking.pnr : 'PREVIEW'}
          </span>
        </div>
      </div>
    </div>
  );
};
