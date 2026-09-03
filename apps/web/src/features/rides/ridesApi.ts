import type { BookingStatus, Seat } from '@carpool/shared';
import { api } from '../../api/client';

/**
 * Kształty odpowiedzi API — spisane z tego, co faktycznie zwracają kontrolery
 * (Prisma zwraca rekord + dołączone relacje), a nie z `RideOffer` z pakietu
 * shared, który opisuje inny, docelowy kształt.
 */
export interface RideListItem {
  id: string;
  driverId: string;
  carModel: string;
  /** Klucz z INTERIORS — z niego wynika liczba miejsc i kształt schematu. */
  interior: string;
  seatCount: number;
  origin: string;
  destination: string;
  departureAt: string;
  driver: { name: string };
  bookings: { seatId: string; status?: BookingStatus }[];
}

export interface MyRide extends Omit<RideListItem, 'driver' | 'bookings'> {
  bookings: { id: string; seatId: string; status: BookingStatus; passenger: { name: string } }[];
}

export interface RideDetail {
  id: string;
  driverId: string;
  carModel: string;
  /** Klucz z INTERIORS — z niego wynika liczba miejsc i kształt schematu. */
  interior: string;
  seatCount: number;
  origin: string;
  destination: string;
  departureAt: string;
  driver: { name: string };
  seats: Seat[];
  bookings: { id: string; seatId: string; passengerId: string; status: BookingStatus }[];
}

export interface MyBooking {
  id: string;
  rideId: string;
  seatId: string;
  passengerId: string;
  status: BookingStatus;
  createdAt: string;
  ride: RideListItem & { driver: { name: string } };
}

export const listRides = () => api<RideListItem[]>('/rides');
export const listMyRides = () => api<MyRide[]>('/rides/mine');
export const getRide = (id: string) => api<RideDetail>(`/rides/${id}`);

export const createRide = (data: {
  carModel: string;
  /** Liczbę miejsc wylicza API z wnętrza — nie przesyłamy jej. */
  interior: string;
  origin: string;
  destination: string;
  departureAt: string;
}) => api<{ id: string }>('/rides', { method: 'POST', body: JSON.stringify(data) });

/** Prośba o miejsce — `note` trafia jako pierwsza wiadomość w wątku. */
export const requestSeat = (rideId: string, seatId: string, note: string) =>
  api<{ id: string; conversationId: string }>('/bookings', {
    method: 'POST',
    body: JSON.stringify({ rideId, seatId, note }),
  });

export const acceptBooking = (bookingId: string) =>
  api(`/bookings/${bookingId}/accept`, { method: 'POST' });

export const rejectBooking = (bookingId: string) =>
  api(`/bookings/${bookingId}/reject`, { method: 'POST' });

export const listMyBookings = () => api<MyBooking[]>('/bookings/my');

export const cancelBooking = (bookingId: string) =>
  api(`/bookings/${bookingId}`, { method: 'DELETE' });
