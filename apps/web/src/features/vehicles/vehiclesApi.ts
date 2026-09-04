import type { Vehicle } from '@carpool/shared';
import { api } from '../../api/client';

export const listVehicles = () => api<Vehicle[]>('/vehicles');

/** Liczbę miejsc i układ foteli wylicza API z wnętrza — nie przesyłamy ich. */
export const createVehicle = (data: { make: string; model: string; interior: string }) =>
  api<Vehicle>('/vehicles', { method: 'POST', body: JSON.stringify(data) });

export const deleteVehicle = (id: string) => api(`/vehicles/${id}`, { method: 'DELETE' });
