/**
 * Typy współdzielone między API, webem i przyszłą aplikacją mobilną.
 * Jedno źródło prawdy dla kształtu danych.
 */

export type Role = 'DRIVER' | 'PASSENGER';

/**
 * FREE / TAKEN / PENDING / DRIVER przychodzą z API. MINE wyliczamy po stronie
 * klienta dla potwierdzonego miejsca zalogowanego pasażera.
 *
 * PENDING widzą tylko zainteresowani — pasażer, który poprosił, i kierowca,
 * który ma zdecydować. Dla reszty miejsce jest po prostu zajęte.
 */
export type SeatStatus = 'FREE' | 'TAKEN' | 'PENDING' | 'DRIVER' | 'MINE';

/** Prośba czeka na kierowcę; zaakceptowana jest rezerwacją. */
export type BookingStatus = 'PENDING' | 'ACCEPTED';

/** Zdarzenia rysują się w wątku inaczej niż zwykła wiadomość. */
export type MessageKind = 'TEXT' | 'REQUEST' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

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
  status: BookingStatus;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  kind: MessageKind;
  body: string;
  /** Miejsce, którego dotyczy zdarzenie — etykieta w wątku. */
  seatId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

/** Wątek pasażer ↔ kierowca w kontekście jednego przejazdu. */
export interface Conversation {
  id: string;
  rideId: string;
  /** Druga strona rozmowy z perspektywy pytającego. */
  withName: string;
  ride: {
    id: string;
    origin: string;
    destination: string;
    departureAt: string;
    carModel: string;
  };
  /** Stan prośby, o ile wciąż istnieje. */
  bookingStatus: BookingStatus | null;
  bookingId: string | null;
  seatId: string | null;
  seatLabel: string | null;
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}
