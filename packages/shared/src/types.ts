/**
 * Typy współdzielone między API, webem i przyszłą aplikacją mobilną.
 * Jedno źródło prawdy dla kształtu danych.
 */

export type Role = 'DRIVER' | 'PASSENGER';

/**
 * FREE / TAKEN / DRIVER przychodzą z API. MINE wyliczamy po stronie klienta
 * dla miejsca zalogowanego pasażera — schemat auta rysuje je inaczej.
 */
export type SeatStatus = 'FREE' | 'TAKEN' | 'DRIVER' | 'MINE';

export interface Seat {
  /** np. "front-right", "rear-left" — stabilny identyfikator miejsca */
  id: string;
  label: string;
  /** pozycja na schemacie auta (siatka: kolumna x, rząd y) */
  x: number;
  y: number;
  status: SeatStatus;
  /** Imię osoby na tym miejscu — API podaje je wyłącznie kierowcy przejazdu. */
  who?: string;
}

export interface RideOffer {
  id: string;
  driverId: string;
  driverName: string;
  carModel: string;
  seatCount: number; // miejsca dla pasażerów (bez kierowcy)
  origin: string;
  destination: string;
  departureAt: string; // ISO date
  seats: Seat[];
}

export interface Booking {
  id: string;
  rideId: string;
  passengerId: string;
  seatId: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}
