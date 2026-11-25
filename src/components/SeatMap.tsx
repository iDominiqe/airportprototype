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
    <div className="space-y-2.5">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] ink-secondary bento-sub rounded-2xl px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-amber-400/25 border border-amber-500/70 inline-block" />
          <span>Business</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-emerald-400/25 border border-emerald-500/70 inline-block" />
          <span>Legroom</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-slate-400/20 border border-slate-400/60 inline-block" />
          <span>Economy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-sky-500 border border-sky-300 inline-block" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-slate-500/20 border border-slate-500/40 inline-block" />
          <span>Taken</span>
        </div>
      </div>

      {/* Aircraft Cabin Frame */}
      <div className="rounded-2xl bento-sub p-3">
        <div className="text-center mb-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bento-sub-strong text-[10px] font-mono font-semibold ink-secondary">
            {destination.aircraftName.toUpperCase()} · {destination.decks === 2 ? 'DOUBLE DECK' : 'CABIN DECK'}
          </div>
        </div>

        {/* Column Header */}
        <div className="grid grid-cols-[1fr_1fr_1fr_18px_1fr_1fr_1fr] gap-1 text-center text-[10px] font-mono ink-muted mb-1.5 px-0.5">
          <span>A (Win)</span>
          <span>B</span>
          <span>C (Aisle)</span>
          <span></span>
          <span>D (Aisle)</span>
          <span>E</span>
          <span>F (Win)</span>
        </div>

        <div className="space-y-1 max-h-[205px] overflow-y-auto slim-scroll pr-1">
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
                  <span className="text-center font-mono text-[10px] font-semibold text-amber-600 dark:text-amber-400">
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
                  <div className="text-[9px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-300 text-center py-0.5 border-y border-emerald-500/25 my-1">
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
                  <span className="text-center font-mono text-[10px] ink-muted">
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
    'bento-sub-strong ink-primary hover:border-sky-400 hover:bg-sky-400/20';

  if (seat.occupied) {
    colorClass =
      'bg-slate-400/15 border-slate-400/30 ink-muted cursor-not-allowed opacity-65';
  } else if (selected) {
    colorClass =
      'bg-gradient-to-br from-sky-400 to-indigo-500 border-sky-200 text-slate-950 font-bold shadow-md shadow-sky-500/25 scale-[1.03]';
  } else if (seat.seatClass === 'business') {
    colorClass =
      'bg-amber-400/20 border-amber-500/55 ink-primary hover:bg-amber-400/35';
  } else if (seat.seatClass === 'legroom') {
    colorClass =
      'bg-emerald-400/20 border-emerald-500/55 ink-primary hover:bg-emerald-400/35';
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
      className={`h-7 rounded-lg border font-mono text-[10px] transition-all flex items-center justify-center ${colorClass}`}
    >
      {seat.occupied ? '×' : seat.id}
    </button>
  );
}
