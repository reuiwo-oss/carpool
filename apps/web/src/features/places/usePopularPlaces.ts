import { useCallback, useEffect, useState } from 'react';
import type { PlaceSuggestion } from '@carpool/shared';
import { listPopularPlaces } from './placesApi';
import { rankPlaces } from './ranking';

/**
 * Lista popularnych miejsc, pobierana raz na sesję.
 *
 * Cache jest na poziomie modułu, nie w `localStorage`: lista zmienia się przy
 * każdej zmianie seeda, a nieświeża lista w przeglądarce, której nie ma jak
 * unieważnić, jest gorsza niż jedno żądanie po odświeżeniu strony. Doba
 * w `Cache-Control` i tak zdejmuje ruch z serwera.
 */
let cache: PlaceSuggestion[] | null = null;

/**
 * Jeden formularz potrafi mieć dwa pickery. Bez tego dwa równoległe żądania
 * poleciałyby po to samo.
 */
let inFlight: Promise<PlaceSuggestion[]> | null = null;

function load(): Promise<PlaceSuggestion[]> {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = listPopularPlaces()
      .then((places) => {
        cache = places;
        return places;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function usePopularPlaces() {
  const [places, setPlaces] = useState<PlaceSuggestion[]>(cache ?? []);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    // Nieosiągalna lista popularnych miejsc nie jest błędem do pokazania:
    // pole i tak przyjmie własną nazwę, a wyszukiwanie na serwerze może
    // działać niezależnie.
    load()
      .then((rows) => alive && setPlaces(rows))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const filterLocal = useCallback((query: string) => rankPlaces(places, query), [places]);

  return { places, filterLocal };
}
