import type { Seat } from '@carpool/shared';
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
  seatCount: number;
  origin: string;
  destination: string;
  departureAt: string;
  driver: { name: string };
  bookings: { seatId: string }[];
}

export interface MyRide extends Omit<RideListItem, 'driver' | 'bookings'> {
  bookings: { seatId: string; passenger: { name: string } }[];
}

export interface RideDetail {
  id: string;
  driverId: string;
  carModel: string;
  seatCount: number;
  origin: string;
  destination: string;
  departureAt: string;
  driver: { name: string };
  seats: Seat[];
  bookings: { id: string; seatId: string; passengerId: string }[];
}

export interface MyBooking {
  id: string;
  rideId: string;
  seatId: string;
  passengerId: string;
  createdAt: string;
  ride: RideListItem & { driver: { name: string } };
}

export const listRides = () => api<RideListItem[]>('/rides');
export const listMyRides = () => api<MyRide[]>('/rides/mine');
export const getRide = (id: string) => api<RideDetail>(`/rides/${id}`);

export const createRide = (data: {
  carModel: string;
  seatCount: number;
  origin: string;
  destination: string;
  departureAt: string;
}) => api<{ id: string }>('/rides', { method: 'POST', body: JSON.stringify(data) });

export const bookSeat = (rideId: string, seatId: string) =>
  api<{ id: string }>('/bookings', { method: 'POST', body: JSON.stringify({ rideId, seatId }) });

export const listMyBookings = () => api<MyBooking[]>('/bookings/my');

export const cancelBooking = (bookingId: string) =>
  api(`/bookings/${bookingId}`, { method: 'DELETE' });
