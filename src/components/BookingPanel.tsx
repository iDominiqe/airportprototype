import React, { useState } from 'react';
import {
  Armchair,
  ArrowRight,
  Clock,
  CreditCard,
  Globe2,
  MapPin,
  Plane,
  Ruler,
} from 'lucide-react';
import { DESTINATIONS, RMO_ORIGIN } from '../data/flights';
import { Destination, FlightMetrics, Seat } from '../types/aviation';
import { SeatMap } from './SeatMap';
import { BoardingPassCard } from './BoardingPassCard';

interface BookingPanelProps {
  selectedDestination: Destination;
  onSelectDestination: (dest: Destination) => void;
  metrics: FlightMetrics;
  seats: Seat[];
  selectedSeat: Seat;
  onSelectSeat: (seat: Seat) => void;
  totalPriceEur: number;
  onOpenGlobe: () => void;
  onProceedToPayment: () => void;
}

export const BookingPanel: React.FC<BookingPanelProps> = ({
  selectedDestination,
  onSelectDestination,
  metrics,
  seats,
  selectedSeat,
  onSelectSeat,
  totalPriceEur,
  onOpenGlobe,
  onProceedToPayment,
}) => {
  const [activeTab, setActiveTab] = useState<'route' | 'seat'>('route');

  return (
    <aside className="pointer-events-auto fixed left-3 md:left-4 top-20 bottom-3 md:bottom-4 z-20 w-[372px] max-w-[calc(100vw-24px)] flex flex-col glass-panel rounded-3xl overflow-hidden">
      {/* Top Origin + Tab Switcher */}
      <div className="p-3.5 pb-2.5 border-b border-slate-700/50 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-beacon" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
              Origin Hub: <strong className="text-white">{RMO_ORIGIN.code}</strong> · {RMO_ORIGIN.city}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenGlobe}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/30 border border-sky-400/30 text-[10px] font-mono text-sky-300 transition-all cursor-pointer"
          >
            <Globe2 className="w-3 h-3" />
            Route Arc
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-700/40">
          <button
            type="button"
            onClick={() => setActiveTab('route')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'route'
                ? 'bg-sky-400 text-slate-950 font-semibold shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Route & Flight
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seat')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'seat'
                ? 'bg-sky-400 text-slate-950 font-semibold shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Armchair className="w-3.5 h-3.5" />
            Seat Map ({selectedSeat.id})
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto slim-scroll p-3.5 space-y-3">
        {activeTab === 'route' ? (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Select Destination from RMO
                </span>
                <span className="text-[10px] font-mono text-sky-300">
                  {DESTINATIONS.length} Direct Routes
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {DESTINATIONS.map((dest) => {
                  const active = dest.code === selectedDestination.code;
                  return (
                    <button
                      key={dest.code}
                      type="button"
                      onClick={() => onSelectDestination(dest)}
                      className={`text-left p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        active
                          ? 'bg-sky-400/20 border-sky-400 shadow-lg shadow-sky-500/10'
                          : 'bg-slate-900/55 border-slate-700/50 hover:border-slate-500/80 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display font-extrabold text-sm text-white">
                          {dest.code}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-emerald-300">
                          €{dest.baseFareEur}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {dest.city}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {dest.aircraftName}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Real-World Great-Circle Flight Calculator */}
            <div className="rounded-2xl bg-slate-900/65 border border-slate-700/50 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-sky-300">
                  Great-Circle Flight Calculator
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  {selectedDestination.haulType}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Ruler className="w-3 h-3 text-sky-400" />
                    Distance
                  </div>
                  <div className="font-mono text-xs font-bold text-white mt-0.5">
                    {metrics.distanceKm.toLocaleString()} km
                  </div>
                </div>
                <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3 text-amber-400" />
                    Duration
                  </div>
                  <div className="font-mono text-xs font-bold text-white mt-0.5">
                    {metrics.durationFormatted}
                  </div>
                </div>
                <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Plane className="w-3 h-3 text-emerald-400" />
                    Gate
                  </div>
                  <div className="font-mono text-xs font-bold text-white mt-0.5">
                    {selectedDestination.gate} · {selectedDestination.departureTime}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
                <span>Aircraft: <strong className="text-white">{selectedDestination.aircraftName}</strong></span>
                <button
                  type="button"
                  onClick={() => setActiveTab('seat')}
                  className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 font-semibold cursor-pointer"
                >
                  Select Seat <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <SeatMap
            destination={selectedDestination}
            seats={seats}
            selectedSeat={selectedSeat}
            onSelectSeat={onSelectSeat}
          />
        )}

        {/* Live Boarding Pass Preview */}
        <BoardingPassCard
          destination={selectedDestination}
          metrics={metrics}
          seat={selectedSeat}
          totalPriceEur={totalPriceEur}
          compact
        />
      </div>

      {/* Bottom Checkout CTA */}
      <div className="p-3.5 pt-2.5 border-t border-slate-700/50 bg-slate-950/45 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300">
            Base €{selectedDestination.baseFareEur} + Seat €{selectedSeat.feeEur} + Tax €
            {metrics.airportTaxEur}
          </span>
          <span className="font-mono font-bold text-base text-emerald-300">
            €{totalPriceEur}
          </span>
        </div>

        <button
          type="button"
          onClick={onProceedToPayment}
          className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 hover:brightness-110 text-slate-950 font-display font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          Proceed to Payment · €{totalPriceEur}
        </button>
      </div>
    </aside>
  );
};
