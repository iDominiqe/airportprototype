import React, { useState } from 'react';
import { CheckCircle2, CreditCard, Lock, ShieldCheck, X } from 'lucide-react';
import { BookingRecord, Destination, FlightMetrics, Seat } from '../types/aviation';

interface CheckoutModalProps {
  open: boolean;
  destination: Destination;
  metrics: FlightMetrics;
  seat: Seat;
  totalPriceEur: number;
  onClose: () => void;
  onConfirmPayment: (booking: BookingRecord) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  destination,
  metrics,
  seat,
  totalPriceEur,
  onClose,
  onConfirmPayment,
}) => {
  const [passengerName, setPassengerName] = useState('Alexandru Popescu');
  const [passportNumber, setPassportNumber] = useState('MD 0849210');
  const [email, setEmail] = useState('alexandru.popescu@rmoskyhub.md');
  const [cardNumber, setCardNumber] = useState('4532 8910 3341 8914');
  const [cardExpiry, setCardExpiry] = useState('09/29');
  const [cardCvv, setCardCvv] = useState('412');
  const [processing, setProcessing] = useState(false);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (processing) return;
    setProcessing(true);

    setTimeout(() => {
      const pnrChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let pnr = 'RM';
      for (let i = 0; i < 4; i++) {
        pnr += pnrChars[Math.floor(Math.random() * pnrChars.length)];
      }
      const digits = cardNumber.replace(/\D/g, '');
      const cardLast4 = digits.slice(-4) || '8914';

      setProcessing(false);
      onConfirmPayment({
        pnr,
        passengerName: passengerName.trim() || 'Alexandru Popescu',
        passportNumber: passportNumber.trim() || 'MD 0849210',
        email: email.trim() || 'passenger@rmoskyhub.md',
        cardLast4,
        totalEur: totalPriceEur,
        issuedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md">
      <div className="bento-elevated rounded-[28px] w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-400/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl aura-hero flex items-center justify-center border border-white/60">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base ink-primary">
                Simulated Flight Checkout
              </h2>
              <p className="text-[11px] ink-muted">
                RMO → {destination.code} ({destination.city}) · Seat {seat.id} · {destination.flightNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full ink-muted hover:ink-primary hover:bg-slate-500/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Passenger Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase ink-muted mb-1">
                Passenger Full Name
              </label>
              <input
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bento-sub-strong text-sm ink-primary focus:outline-none focus:ring-2 focus:ring-sky-400"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase ink-muted mb-1">
                Passport / ID
              </label>
              <input
                type="text"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bento-sub-strong text-sm font-mono ink-primary focus:outline-none focus:ring-2 focus:ring-sky-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase ink-muted mb-1">
              Boarding Pass Delivery Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bento-sub-strong text-sm ink-primary focus:outline-none focus:ring-2 focus:ring-sky-400"
              required
            />
          </div>

          {/* Demo Payment Card */}
          <div className="p-3.5 rounded-2xl bento-sub space-y-3">
            <div className="flex items-center justify-between text-xs ink-secondary">
              <span className="flex items-center gap-1.5 font-medium">
                <CreditCard className="w-4 h-4 text-sky-500" />
                Demo Card (Pre-filled Sandbox)
              </span>
              <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-300 flex items-center gap-1 font-semibold">
                <Lock className="w-3 h-3" /> TLS SIMULATED
              </span>
            </div>

            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bento-sub-strong text-sm font-mono ink-primary focus:outline-none focus:ring-2 focus:ring-sky-400"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(e.target.value)}
                placeholder="MM/YY"
                className="w-full px-3 py-2 rounded-xl bento-sub-strong text-sm font-mono ink-primary focus:outline-none focus:ring-2 focus:ring-sky-400"
                required
              />
              <input
                type="text"
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value)}
                placeholder="CVV"
                className="w-full px-3 py-2 rounded-xl bento-sub-strong text-sm font-mono ink-primary focus:outline-none focus:ring-2 focus:ring-sky-400"
                required
              />
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="rounded-2xl bento-sub p-3 text-xs space-y-1.5">
            <div className="flex justify-between ink-secondary">
              <span>Base Fare ({destination.flightNumber} · {destination.aircraftName})</span>
              <span className="font-mono">€{destination.baseFareEur}</span>
            </div>
            <div className="flex justify-between ink-secondary">
              <span>Seat Selection ({seat.id} · {seat.positionType})</span>
              <span className="font-mono">€{seat.feeEur}</span>
            </div>
            <div className="flex justify-between ink-secondary">
              <span>RMO Airport & Navigation Fee</span>
              <span className="font-mono">€{metrics.airportTaxEur}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-400/25 font-bold text-sm ink-primary">
              <span>Total Due</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-300">€{totalPriceEur}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full py-3 px-4 rounded-2xl iridescent-cta disabled:opacity-70 font-display font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            {processing
              ? 'Authorizing & Clearing Runway 08R...'
              : `Confirm & Pay · €${totalPriceEur}`}
          </button>
        </form>
      </div>
    </div>
  );
};
