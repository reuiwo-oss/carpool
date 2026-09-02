import type { RideOffer } from '@carpool/shared';
import { api } from '../../api/client';

export const listRides = () => api<RideOffer[]>('/rides');
export const getRide = (id: string) => api<RideOffer>(`/rides/${id}`);

export const createRide = (data: {
  carModel: string;
  seatCount: number;
  origin: string;
  destination: string;
  departureAt: string;
}) => api<RideOffer>('/rides', { method: 'POST', body: JSON.stringify(data) });

export const bookSeat = (rideId: string, seatId: string) =>
  api('/bookings', { method: 'POST', body: JSON.stringify({ rideId, seatId }) });
