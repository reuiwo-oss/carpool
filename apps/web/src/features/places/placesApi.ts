import type { PlaceSuggestion } from '@carpool/shared';
import { api } from '../../api/client';

/** Krótka lista popularnych miejsc — jedno żądanie na sesję, patrz `usePopularPlaces`. */
export const listPopularPlaces = () => api<PlaceSuggestion[]>('/places/popular');

/**
 * Wyszukiwanie w pełnej bazie. `signal` jest obowiązkowy w praktyce: przy
 * pisaniu w polu leci kilka żądań pod rząd i liczy się tylko ostatnie.
 */
export const searchPlaces = (query: string, signal?: AbortSignal) =>
  api<PlaceSuggestion[]>(`/places/search?q=${encodeURIComponent(query)}&limit=10`, { signal });
