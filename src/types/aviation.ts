export type LightingMode = 'day' | 'sunset' | 'night';

export type GraphicsQuality = 'hd' | 'clay';

export type CameraPreset = 'overview' | 'tower' | 'departure' | 'globe';

export type AircraftVariant = 'a380' | 'a350' | 'b787' | 'a320' | 'b737';

export type AirlineLivery = 'nova' | 'euro' | 'sky' | 'pacific';

export type SeatClass = 'business' | 'legroom' | 'economy';

export type TakeoffPhase =
  | 'idle'
  | 'pushback'
  | 'taxi'
  | 'spool'
  | 'takeoff_roll'
  | 'rotate_climb'
  | 'departed';

export interface AirportHub {
  code: string;
  icao: string;
  city: string;
  country: string;
  name: string;
  lat: number;
  lon: number;
}

export interface Destination {
  code: string;
  icao: string;
  city: string;
  country: string;
  airportName: string;
  lat: number;
  lon: number;
  flightNumber: string;
  aircraftVariant: AircraftVariant;
  aircraftName: string;
  wingspanM: number;
  lengthM: number;
  engineCount: 2 | 4;
  decks: 1 | 2;
  gate: string;
  departureTime: string;
  baseFareEur: number;
  cruiseSpeedKmh: number;
  haulType: 'Short-Haul' | 'Medium-Haul' | 'Long-Haul';
  terminalZone: string;
}

export interface FlightMetrics {
  distanceKm: number;
  durationMinutes: number;
  durationFormatted: string;
  co2Kg: number;
  airportTaxEur: number;
}

export interface Seat {
  id: string;
  row: number;
  column: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  seatClass: SeatClass;
  positionType: 'Window' | 'Middle' | 'Aisle';
  feeEur: number;
  occupied: boolean;
}

export interface BookingRecord {
  pnr: string;
  passengerName: string;
  passportNumber: string;
  email: string;
  cardLast4: string;
  totalEur: number;
  issuedAt: string;
}

export interface TelemetryState {
  phase: TakeoffPhase;
  airspeedKmh: number;
  altitudeM: number;
  thrustN1Pct: number;
  gearState: 'DOWN' | 'TRANSIT' | 'UP';
  elapsedSec: number;
  atcCallout: string;
}
