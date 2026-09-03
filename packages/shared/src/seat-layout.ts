import type { Seat } from './types.js';

/**
 * Wszystkie możliwe miejsca pasażerskie na siatce schematu auta.
 * x = kolumna (0 lewa, 1 środek, 2 prawa), y = rząd (0 przód).
 * Kierowca zawsze przód-lewy (ruch prawostronny).
 */
export const SEAT_SLOTS: Record<string, { label: string; x: number; y: number }> = {
  'front-right': { label: 'Przód prawe', x: 2, y: 0 },
  'rear-left': { label: 'Tył lewe', x: 0, y: 1 },
  'rear-middle': { label: 'Tył środek', x: 1, y: 1 },
  'rear-right': { label: 'Tył prawe', x: 2, y: 1 },
  'third-left': { label: '3. rząd lewe', x: 0, y: 2 },
  'third-middle': { label: '3. rząd środek', x: 1, y: 2 },
  'third-right': { label: '3. rząd prawe', x: 2, y: 2 },
};

export interface CarInterior {
  label: string;
  desc: string;
  /** Miejsca pasażerskie tego wnętrza, w kolejności rysowania. */
  slots: string[];
  /** Wysokość bagażnika w jednostkach viewBox schematu. */
  trunk: number;
  /** Otwarta skrzynia (pickup) rysuje się inaczej niż zamknięty bagażnik. */
  open: boolean;
}

/**
 * Wnętrza auta. W tej fazie wdrożony jest tylko `sedan` — SUV i pickup czekają
 * na swoje etapy, ale siedzą tutaj, żeby model danych był na nie gotowy
 * (`ride.interior` jest zwykłym stringiem, nie enumem w bazie).
 */
export const INTERIORS: Record<string, CarInterior> = {
  sedan: {
    label: 'Kombi 5-osobowe',
    desc: '2 + 3 · duży bagażnik',
    slots: ['front-right', 'rear-left', 'rear-middle', 'rear-right'],
    trunk: 68,
    open: false,
  },
  suv: {
    label: 'SUV 7-osobowy',
    desc: '2 + 3 + 2 · mniejszy bagażnik',
    slots: ['front-right', 'rear-left', 'rear-middle', 'rear-right', 'third-left', 'third-right'],
    trunk: 52,
    open: false,
  },
  pickup: {
    label: 'Pickup 4-osobowy',
    desc: '2 + 2 · otwarta skrzynia',
    slots: ['front-right', 'rear-left', 'rear-right'],
    trunk: 118,
    open: true,
  },
};

/** Wnętrza wdrożone w tej fazie — reszta jest widoczna, ale wyłączona. */
export const SHIPPED_INTERIORS = ['sedan'];

export const DEFAULT_INTERIOR = 'sedan';

export const interiorOf = (interior?: string | null): CarInterior =>
  INTERIORS[interior ?? ''] ?? INTERIORS[DEFAULT_INTERIOR];

/** Liczba miejsc pasażerskich wynika z wnętrza — nie ustawia jej kierowca. */
export const seatCountOf = (interior?: string | null) => interiorOf(interior).slots.length;

/**
 * Układ miejsc dla wybranego wnętrza: kierowca + fotele pasażerskie.
 * Ten sam generator działa po stronie API (zapis do bazy) i weba (podgląd
 * przy publikacji oraz miniatury na kartach).
 */
export function seatLayoutFor(interior?: string | null): Seat[] {
  const seats: Seat[] = [{ id: 'driver', label: 'Kierowca', x: 0, y: 0, status: 'DRIVER' }];
  for (const id of interiorOf(interior).slots) {
    const slot = SEAT_SLOTS[id];
    if (slot) seats.push({ id, label: slot.label, x: slot.x, y: slot.y, status: 'FREE' });
  }
  return seats;
}
