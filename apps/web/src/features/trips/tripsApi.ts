import type {
  LegDirection,
  MyTrips,
  ReservationLegs,
  Trip,
  TripStatus,
  TripSummary,
  TripVisibility,
} from '@carpool/shared';
import { api } from '../../api/client';

/**
 * Kształty odpowiedzi są w pakiecie shared — API buduje je z tych samych typów,
 * więc nie ma tu drugiego opisu tego samego.
 */

export interface NewTrip {
  title: string;
  destination: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  visibility?: TripVisibility;
}

export interface NewLeg {
  direction: LegDirection;
  origin: string;
  departureAt: string;
  arrivalAt?: string;
}

export const listTrips = () => api<TripSummary[]>('/trips');

export const getTrip = (id: string) => api<Trip>(`/trips/${id}`);

export const listMyTrips = () => api<MyTrips>('/trips/mine');

export const createTrip = (data: NewTrip) =>
  api<{ id: string }>('/trips', { method: 'POST', body: JSON.stringify(data) });

export const updateTrip = (id: string, data: { status?: TripStatus; visibility?: TripVisibility }) =>
  api(`/trips/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const joinTrip = (id: string) => api(`/trips/${id}/join`, { method: 'POST' });

export const leaveTrip = (id: string) => api(`/trips/${id}/leave`, { method: 'DELETE' });

/** Auto w wycieczce — jedno na uczestnika, z odcinkami dojazdu i powrotu. */
export const addTripRide = (
  tripId: string,
  data: { vehicleId: string; note?: string; legs: NewLeg[] },
) => api<{ id: string }>(`/trips/${tripId}/rides`, { method: 'POST', body: JSON.stringify(data) });

export const updateLeg = (
  tripId: string,
  rideId: string,
  direction: LegDirection,
  data: { origin?: string; departureAt?: string; arrivalAt?: string },
) =>
  api(`/trips/${tripId}/rides/${rideId}/legs/${direction}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const removeTripRide = (tripId: string, rideId: string) =>
  api(`/trips/${tripId}/rides/${rideId}`, { method: 'DELETE' });

/** `note` trafia jako pierwsza wiadomość w wątku z kierowcą. */
export const reserveSeat = (
  tripId: string,
  rideId: string,
  seatId: string,
  opts: { legs?: ReservationLegs; note?: string } = {},
) =>
  api<{ id: string; conversationId: string }>(
    `/trips/${tripId}/rides/${rideId}/reservations`,
    {
      method: 'POST',
      body: JSON.stringify({
        seatId,
        ...(opts.legs ? { legs: opts.legs } : {}),
        ...(opts.note ? { note: opts.note } : {}),
      }),
    },
  );

export const acceptReservation = (id: string) =>
  api(`/reservations/${id}/accept`, { method: 'POST' });

/** Rezygnacja pasażera i odmowa kierowcy to to samo żądanie. */
export const cancelReservation = (id: string) => api(`/reservations/${id}`, { method: 'DELETE' });
