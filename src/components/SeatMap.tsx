import React from 'react';
import { Destination, Seat } from '../types/aviation';

interface SeatMapProps {
  destination: Destination;
  seats: Seat[];
  selectedSeat: Seat;
  onSelectSeat: (seat: Seat) => void;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  destination,
  seats,
  selectedSeat,
  onSelectSeat,
}) => {
  const rows = Array.from({ length: 14 }, (_, i) => i + 1);

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-300 bg-slate-900/55 rounded-xl px-2.5 py-2 border border-slate-700/50">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-400/25 border border-amber-400/70 inline-block" />
          <span>Business</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-400/25 border border-emerald-400/70 inline-block" />
          <span>Legroom</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-700/70 border border-slate-500/60 inline-block" />
          <span>Economy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-sky-400 border border-sky-200 inline-block" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-800/60 border border-slate-700/60 opacity-40 inline-block" />
          <span>Occupied</span>
        </div>
      </div>

      {/* Aircraft Fuselage Frame */}
      <div className="rounded-2xl bg-slate-950/65 border border-slate-700/50 p-3">
        <div className="text-center mb-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-800/80 border border-slate-600/40 text-[10px] font-mono text-sky-300">
            {destination.aircraftName.toUpperCase()} · CABIN DECK
          </div>
        </div>

        {/* Column Header */}
        <div className="grid grid-cols-[1fr_1fr_1fr_18px_1fr_1fr_1fr] gap-1 text-center text-[10px] font-mono text-slate-400 mb-1.5 px-1">
          <span>A (Win)</span>
          <span>B</span>
          <span>C (Aisle)</span>
          <span></span>
          <span>D (Aisle)</span>
          <span>E</span>
          <span>F (Win)</span>
        </div>

        <div className="space-y-1 max-h-[210px] overflow-y-auto slim-scroll pr-1">
          {rows.map((rowNum) => {
            const rowSeats = seats.filter((s) => s.row === rowNum);
            const isBusiness = rowNum <= 3;
            const isLegroom = rowNum === 4;

            if (isBusiness) {
              const sA = rowSeats.find((s) => s.column === 'A')!;
              const sC = rowSeats.find((s) => s.column === 'C')!;
              const sD = rowSeats.find((s) => s.column === 'D')!;
              const sF = rowSeats.find((s) => s.column === 'F')!;

              return (
                <div
                  key={rowNum}
                  className="grid grid-cols-[1.5fr_1.5fr_22px_1.5fr_1.5fr] gap-1.5 items-center"
                >
                  {[sA, sC].map((seat) => (
                    <SeatButton
                      key={seat.id}
                      seat={seat}
                      selected={selectedSeat.id === seat.id}
                      onSelect={onSelectSeat}
                    />
                  ))}
                  <span className="text-center font-mono text-[10px] text-amber-300/80">
                    {rowNum}
                  </span>
                  {[sD, sF].map((seat) => (
                    <SeatButton
                      key={seat.id}
                      seat={seat}
                      selected={selectedSeat.id === seat.id}
                      onSelect={onSelectSeat}
                    />
                  ))}
                </div>
              );
            }

            const leftCols = rowSeats.slice(0, 3);
            const rightCols = rowSeats.slice(3, 6);

            return (
              <React.Fragment key={rowNum}>
                {isLegroom && (
                  <div className="text-[9px] font-mono uppercase tracking-wider text-emerald-300/90 text-center py-0.5 border-y border-emerald-500/20 my-1">
                    Exit Row · Extra Legroom (+€35)
                  </div>
                )}
                <div className="grid grid-cols-[1fr_1fr_1fr_18px_1fr_1fr_1fr] gap-1 items-center">
                  {leftCols.map((seat) => (
                    <SeatButton
                      key={seat.id}
                      seat={seat}
                      selected={selectedSeat.id === seat.id}
                      onSelect={onSelectSeat}
                    />
                  ))}
                  <span className="text-center font-mono text-[10px] text-slate-400">
                    {rowNum}
                  </span>
                  {rightCols.map((seat) => (
                    <SeatButton
                      key={seat.id}
                      seat={seat}
                      selected={selectedSeat.id === seat.id}
                      onSelect={onSelectSeat}
                    />
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function SeatButton({
  seat,
  selected,
  onSelect,
}: {
  seat: Seat;
  selected: boolean;
  onSelect: (seat: Seat) => void;
}) {
  let colorClass =
    'bg-slate-800/85 border-slate-600/60 text-slate-200 hover:border-sky-400 hover:bg-sky-500/20';

  if (seat.occupied) {
    colorClass =
      'bg-slate-800/80 border-slate-700/80 text-slate-400 cursor-not-allowed opacity-70';
  } else if (selected) {
    colorClass =
      'bg-sky-400 border-sky-200 text-slate-950 font-bold shadow-md shadow-sky-400/30 scale-[1.03]';
  } else if (seat.seatClass === 'business') {
    colorClass =
      'bg-amber-400/15 border-amber-400/55 text-amber-200 hover:bg-amber-400/30';
  } else if (seat.seatClass === 'legroom') {
    colorClass =
      'bg-emerald-400/15 border-emerald-400/55 text-emerald-200 hover:bg-emerald-400/30';
  }

  return (
    <button
      type="button"
      disabled={seat.occupied}
      onClick={() => onSelect(seat)}
      title={
        seat.occupied
          ? `Seat ${seat.id} — Occupied`
          : `Seat ${seat.id} (${seat.positionType}) · +€${seat.feeEur}`
      }
      className={`h-7 rounded-md border font-mono text-[10px] transition-all flex items-center justify-center ${colorClass}`}
    >
      {seat.occupied ? '×' : seat.id}
    </button>
  );
}
