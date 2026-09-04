import type { RideRequest } from '@carpool/shared';
import { api } from '../../api/client';

export const listRideRequests = () => api<RideRequest[]>('/ride-requests');

export const createRideRequest = (data: {
  destination: string;
  dateFrom: string;
  dateTo: string;
  seatsNeeded?: number;
  note?: string;
}) => api<RideRequest>('/ride-requests', { method: 'POST', body: JSON.stringify(data) });

/** Jedyna sensowna zmiana: „już mam czym jechać". */
export const fulfillRideRequest = (id: string) =>
  api(`/ride-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'FULFILLED' }) });

export const deleteRideRequest = (id: string) =>
  api(`/ride-requests/${id}`, { method: 'DELETE' });
