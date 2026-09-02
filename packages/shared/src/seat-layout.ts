import type { Seat } from './types.js';

/**
 * Generuje domyślny układ miejsc dla auta o zadanej liczbie miejsc pasażerskich.
 * Siatka: x = kolumna (0 lewa, 1 środek, 2 prawa), y = rząd (0 przód).
 * Kierowca zawsze przód-lewy (ruch prawostronny). Do doprecyzowania:
 * niestandardowe układy (van 3+ rzędy, busy) i edytor układu dla kierowcy.
 */
export function generateSeatLayout(passengerSeats: number): Seat[] {
  const seats: Seat[] = [
    { id: 'driver', label: 'Kierowca', x: 0, y: 0, status: 'DRIVER' },
  ];

  const slots: Array<{ id: string; label: string; x: number; y: number }> = [
    { id: 'front-right', label: 'Przód prawe', x: 2, y: 0 },
    { id: 'rear-left', label: 'Tył lewe', x: 0, y: 1 },
    { id: 'rear-middle', label: 'Tył środek', x: 1, y: 1 },
    { id: 'rear-right', label: 'Tył prawe', x: 2, y: 1 },
    { id: 'third-left', label: '3. rząd lewe', x: 0, y: 2 },
    { id: 'third-middle', label: '3. rząd środek', x: 1, y: 2 },
    { id: 'third-right', label: '3. rząd prawe', x: 2, y: 2 },
  ];

  for (const slot of slots.slice(0, passengerSeats)) {
    seats.push({ ...slot, status: 'FREE' });
  }
  return seats;
}
