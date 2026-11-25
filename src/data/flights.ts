import { AirportHub, Destination, FlightMetrics } from '../types/aviation';

export const RMO_ORIGIN: AirportHub = {
  code: 'RMO',
  icao: 'LUKK',
  city: 'Chișinău',
  country: 'Moldova',
  name: 'Chișinău International Airport',
  lat: 46.9277,
  lon: 28.9310,
};

export const DESTINATIONS: Destination[] = [
  {
    code: 'OTP',
    icao: 'LROP',
    city: 'Bucharest',
    country: 'Romania',
    airportName: 'Henri Coandă International',
    lat: 44.5711,
    lon: 26.0850,
    flightNumber: 'NV 204',
    aircraftVariant: 'a320',
    aircraftName: 'Airbus A320neo',
    gate: 'G2',
    departureTime: '14:25',
    baseFareEur: 79,
    cruiseSpeedKmh: 760,
    haulType: 'Short-Haul',
    terminalZone: 'Schengen East',
  },
  {
    code: 'IST',
    icao: 'LTFM',
    city: 'Istanbul',
    country: 'Türkiye',
    airportName: 'Istanbul Grand Airport',
    lat: 41.2753,
    lon: 28.7519,
    flightNumber: 'NV 418',
    aircraftVariant: 'b737',
    aircraftName: 'Boeing 737-800',
    gate: 'G3',
    departureTime: '15:10',
    baseFareEur: 119,
    cruiseSpeedKmh: 810,
    haulType: 'Short-Haul',
    terminalZone: 'Bosphorus Gate',
  },
  {
    code: 'FRA',
    icao: 'EDDF',
    city: 'Frankfurt',
    country: 'Germany',
    airportName: 'Frankfurt am Main',
    lat: 50.0379,
    lon: 8.5622,
    flightNumber: 'NV 512',
    aircraftVariant: 'a320',
    aircraftName: 'Airbus A320neo',
    gate: 'G4',
    departureTime: '16:05',
    baseFareEur: 149,
    cruiseSpeedKmh: 825,
    haulType: 'Medium-Haul',
    terminalZone: 'Central Europe',
  },
  {
    code: 'CDG',
    icao: 'LFPG',
    city: 'Paris',
    country: 'France',
    airportName: 'Charles de Gaulle',
    lat: 49.0097,
    lon: 2.5479,
    flightNumber: 'NV 630',
    aircraftVariant: 'b737',
    aircraftName: 'Boeing 737-800',
    gate: 'G3',
    departureTime: '17:20',
    baseFareEur: 169,
    cruiseSpeedKmh: 828,
    haulType: 'Medium-Haul',
    terminalZone: 'West Europe',
  },
  {
    code: 'LTN',
    icao: 'EGGW',
    city: 'London',
    country: 'United Kingdom',
    airportName: 'London Luton Airport',
    lat: 51.8747,
    lon: -0.3683,
    flightNumber: 'NV 702',
    aircraftVariant: 'a320',
    aircraftName: 'Airbus A320neo',
    gate: 'G5',
    departureTime: '18:15',
    baseFareEur: 159,
    cruiseSpeedKmh: 830,
    haulType: 'Medium-Haul',
    terminalZone: 'North Atlantic',
  },
  {
    code: 'DXB',
    icao: 'OMDB',
    city: 'Dubai',
    country: 'UAE',
    airportName: 'Dubai International',
    lat: 25.2532,
    lon: 55.3657,
    flightNumber: 'NV 880',
    aircraftVariant: 'b787',
    aircraftName: 'Boeing 787-9 Dreamliner',
    gate: 'G3',
    departureTime: '20:40',
    baseFareEur: 349,
    cruiseSpeedKmh: 903,
    haulType: 'Long-Haul',
    terminalZone: 'Wide-Body Concourse',
  },
  {
    code: 'NRT',
    icao: 'RJAA',
    city: 'Tokyo',
    country: 'Japan',
    airportName: 'Narita International',
    lat: 35.7720,
    lon: 140.3929,
    flightNumber: 'NV 900',
    aircraftVariant: 'a350',
    aircraftName: 'Airbus A350-900',
    gate: 'G3',
    departureTime: '22:10',
    baseFareEur: 689,
    cruiseSpeedKmh: 910,
    haulType: 'Long-Haul',
    terminalZone: 'Trans-Eurasia Wing',
  },
];

const EARTH_RADIUS_KM = 6371;

export function calculateGreatCircleKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c);
}

export function calculateFlightMetrics(dest: Destination): FlightMetrics {
  const distanceKm = calculateGreatCircleKm(
    RMO_ORIGIN.lat,
    RMO_ORIGIN.lon,
    dest.lat,
    dest.lon
  );
  // Cruise time + 25 min taxi/climb/descent terminal procedure buffer
  const cruiseMinutes = (distanceKm / dest.cruiseSpeedKmh) * 60;
  const durationMinutes = Math.max(45, Math.round(cruiseMinutes + 25));
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const durationFormatted = hours > 0 ? `${hours}h ${mins.toString().padStart(2, '0')}m` : `${mins}m`;
  const co2Kg = Math.round(distanceKm * (dest.haulType === 'Long-Haul' ? 0.088 : 0.095));
  const airportTaxEur = dest.haulType === 'Long-Haul' ? 42 : 24;

  return {
    distanceKm,
    durationMinutes,
    durationFormatted,
    co2Kg,
    airportTaxEur,
  };
}
