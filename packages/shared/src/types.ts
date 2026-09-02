/**
 * Typy współdzielone między API, webem i przyszłą aplikacją mobilną.
 * Jedno źródło prawdy dla kształtu danych.
 */

export type Role = 'DRIVER' | 'PASSENGER';

export type SeatStatus = 'FREE' | 'TAKEN' | 'DRIVER';

export interface Seat {
  /** np. "front-right", "rear-left" — stabilny identyfikator miejsca */
  id: string;
  label: string;
  /** pozycja na schemacie auta (siatka: kolumna x, rząd y) */
  x: number;
  y: number;
  status: SeatStatus;
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
