import { Destination, Seat, SeatClass } from '../types/aviation';

const BUSINESS_COLS: Array<'A' | 'C' | 'D' | 'F'> = ['A', 'C', 'D', 'F'];
const ECONOMY_COLS: Array<'A' | 'B' | 'C' | 'D' | 'E' | 'F'> = ['A', 'B', 'C', 'D', 'E', 'F'];

function deterministicHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function getPositionType(col: 'A' | 'B' | 'C' | 'D' | 'E' | 'F', seatClass: SeatClass): 'Window' | 'Middle' | 'Aisle' {
  if (col === 'A' || col === 'F') return 'Window';
  if (seatClass === 'business' || col === 'C' || col === 'D') return 'Aisle';
  return 'Middle';
}

export function generateSeatsForDestination(dest: Destination): Seat[] {
  const seats: Seat[] = [];
  const isLongHaul = dest.haulType === 'Long-Haul';
  const businessFee = isLongHaul ? 260 : 140;

  for (let row = 1; row <= 14; row++) {
    const isBusiness = row <= 3;
    const isLegroom = row === 4;
    const seatClass: SeatClass = isBusiness ? 'business' : isLegroom ? 'legroom' : 'economy';
    const cols = isBusiness ? BUSINESS_COLS : ECONOMY_COLS;

    for (const column of cols) {
      const id = `${row}${column}`;
      const positionType = getPositionType(column, seatClass);

      let feeEur = 0;
      if (seatClass === 'business') {
        feeEur = businessFee;
      } else if (seatClass === 'legroom') {
        feeEur = 35;
      } else if (positionType === 'Window') {
        feeEur = 18;
      } else if (positionType === 'Aisle') {
        feeEur = 10;
      }

      // Deterministic occupancy (~32%), keeping 12A and 2A always free for quick demos
      const seed = deterministicHash(`${dest.code}-${id}`);
      const occupied = id === '12A' || id === '2A' ? false : seed % 100 < 32;

      seats.push({
        id,
        row,
        column,
        seatClass,
        positionType,
        feeEur,
        occupied,
      });
    }
  }

  return seats;
}

export function getDefaultSeat(seats: Seat[]): Seat {
  return (
    seats.find((s) => s.id === '12A' && !s.occupied) ||
    seats.find((s) => !s.occupied) ||
    seats[0]
  );
}
