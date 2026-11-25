import React, { useState } from 'react';
import {
  Armchair,
  ArrowRight,
  CreditCard,
  Globe2,
  MapPin,
} from 'lucide-react';
import { DESTINATIONS, RMO_ORIGIN } from '../data/flights';
import { Destination, FlightMetrics, Seat } from '../types/aviation';
import { SeatMap } from './SeatMap';
import { BoardingPassCard } from './BoardingPassCard';
import { DotMatrixDigits } from './DotMatrixDigits';

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

  const speedPct = Math.min(100, Math.round((selectedDestination.cruiseSpeedKmh / 950) * 100));
  const distPct = Math.min(100, Math.round((metrics.distanceKm / 9000) * 100));
  const ecoScore = Math.max(48, Math.round(100 - metrics.co2Kg / 18));

  return (
    <aside className="pointer-events-auto fixed left-3 md:left-4 top-[72px] bottom-3 md:bottom-4 z-20 w-[382px] max-w-[calc(100vw-24px)] flex flex-col bento-card rounded-[28px] overflow-hidden">
      {/* Top Origin + Pill Tabs */}
      <div className="p-3.5 pb-2.5 border-b border-slate-400/20 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-beacon" />
            <span className="text-[11px] font-mono uppercase tracking-wider ink-secondary">
              Hub: <strong className="ink-primary">{RMO_ORIGIN.code}</strong> · {RMO_ORIGIN.city}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenGlobe}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bento-sub text-[10px] font-mono font-semibold ink-primary hover:opacity-80 transition-all cursor-pointer"
          >
            <Globe2 className="w-3 h-3 text-sky-500" />
            Route Arc
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 bento-sub p-1 rounded-full">
          <button
            type="button"
            onClick={() => setActiveTab('route')}
            style={
              activeTab === 'route'
                ? { backgroundColor: 'var(--pill-active-bg)', color: 'var(--pill-active-ink)' }
                : undefined
            }
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'route' ? 'font-semibold shadow-sm' : 'ink-secondary'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Route & Insights
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seat')}
            style={
              activeTab === 'seat'
                ? { backgroundColor: 'var(--pill-active-bg)', color: 'var(--pill-active-ink)' }
                : undefined
            }
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'seat' ? 'font-semibold shadow-sm' : 'ink-secondary'
            }`}
          >
            <Armchair className="w-3.5 h-3.5" />
            Seat Map ({selectedSeat.id})
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto slim-scroll p-3.5 space-y-3">
        {/* Hero Luminous Aura Summary Card (Images 1 & 2 aesthetic) */}
        <div className="rounded-2xl p-3.5 aura-hero border border-white/60 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-full bg-white/65 dark:bg-slate-900/60 text-[10px] font-mono font-bold tracking-wide">
              {selectedDestination.flightNumber} · GATE {selectedDestination.gate}
            </span>
            <span className="text-[10px] font-mono font-semibold opacity-80">
              {selectedDestination.engineCount}-ENG · {selectedDestination.wingspanM}M SPAN
            </span>
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[11px] font-medium opacity-75">
                Chișinău → {selectedDestination.city}
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <DotMatrixDigits
                  value={metrics.distanceKm.toLocaleString()}
                  dotSize={2.6}
                  color="currentColor"
                />
                <span className="font-mono text-[11px] font-bold opacity-80">KM</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-medium opacity-75">Flight Time</div>
              <div className="font-display font-extrabold text-base">
                {metrics.durationFormatted}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-current/10 text-[11px]">
            <span className="font-semibold truncate">{selectedDestination.aircraftName}</span>
            <button
              type="button"
              onClick={() => setActiveTab('seat')}
              className="inline-flex items-center gap-1 font-bold hover:opacity-75 cursor-pointer shrink-0"
            >
              Seats <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {activeTab === 'route' ? (
          <>
            {/* Destination Bento Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider ink-muted">
                  Destinations from RMO
                </span>
                <span className="text-[10px] font-mono font-semibold text-sky-600 dark:text-sky-300">
                  {DESTINATIONS.length} Direct
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
                          ? 'bg-gradient-to-br from-sky-400/20 via-cyan-300/15 to-violet-400/20 border-sky-400 shadow-sm'
                          : 'bento-sub-strong hover:border-sky-400/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display font-extrabold text-sm ink-primary">
                          {dest.code}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
                          €{dest.baseFareEur}
                        </span>
                      </div>
                      <div className="text-xs font-medium ink-secondary truncate">
                        {dest.city}
                      </div>
                      <div className="text-[10px] ink-muted truncate">
                        {dest.aircraftName}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Real-Time Insights Card (Reference Image 6 Gradient Track Sliders) */}
            <div className="rounded-2xl bento-sub p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold ink-primary">Real-Time Flight Insights</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-semibold">
                  Cleared
                </span>
              </div>

              <InsightBar
                label="Cruise Velocity"
                valueText={`${selectedDestination.cruiseSpeedKmh} KM/H`}
                percent={speedPct}
                gradient="linear-gradient(90deg, #38bdf8, #818cf8)"
              />
              <InsightBar
                label="Great-Circle Arc"
                valueText={`${metrics.distanceKm.toLocaleString()} KM`}
                percent={distPct}
                gradient="linear-gradient(90deg, #34d399, #38bdf8)"
              />
              <InsightBar
                label="Eco Fuel Efficiency"
                valueText={`${metrics.co2Kg} kg CO₂`}
                percent={ecoScore}
                gradient="linear-gradient(90deg, #fb923c, #34d399)"
              />
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

      {/* Bottom Iridescent CTA Footer */}
      <div className="p-3.5 pt-2.5 border-t border-slate-400/20 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="ink-muted">
            Fare €{selectedDestination.baseFareEur} + Seat €{selectedSeat.feeEur} + Tax €
            {metrics.airportTaxEur}
          </span>
          <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-300">
            €{totalPriceEur}
          </span>
        </div>

        <button
          type="button"
          onClick={onProceedToPayment}
          className="w-full py-2.5 px-4 rounded-2xl iridescent-cta font-display font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          Proceed to Payment · €{totalPriceEur}
        </button>
      </div>
    </aside>
  );
};

function InsightBar({
  label,
  valueText,
  percent,
  gradient,
}: {
  label: string;
  valueText: string;
  percent: number;
  gradient: string;
}) {
  const clamped = Math.max(8, Math.min(96, percent));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="ink-secondary font-medium">{label}</span>
        <span className="font-mono font-semibold ink-primary">{valueText}</span>
      </div>
      <div className="relative h-2 rounded-full bg-slate-400/20 overflow-visible">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${clamped}%`, background: gradient }}
        />
        <span
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-3.5 rounded-full bg-slate-900 dark:bg-white border-2 border-white dark:border-slate-900 shadow transition-all duration-300"
          style={{ left: `calc(${clamped}% - 5px)` }}
        />
      </div>
    </div>
  );
}
