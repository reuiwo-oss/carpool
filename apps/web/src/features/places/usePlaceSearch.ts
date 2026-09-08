import { useEffect, useMemo, useState } from 'react';
import type { PlaceSuggestion } from '@carpool/shared';
import { searchPlaces } from './placesApi';
import { usePopularPlaces } from './usePopularPlaces';

export { rankPlaces } from './ranking';

/** Poniżej dwóch znaków serwer i tak odmówi — nie ma po co pytać. */
const MIN_SERVER_QUERY = 2;

/** Tyle czekamy na kolejny znak, zanim uznamy, że użytkownik przestał pisać. */
const DEBOUNCE_MS = 200;

/**
 * Cała logika podpowiedzi: filtrowanie lokalne, dopytanie serwera, scalenie.
 * Stoi osobno od `PlacePicker`, żeby warstwa DOM została samym rysowaniem —
 * przy przeniesieniu na React Native ten plik zostaje bez zmiany.
 *
 * Lista lokalna pokazuje się natychmiast, wyniki z serwera doklejają się pod
 * spodem, gdy przyjdą. Dzięki temu pole nigdy nie miga pustką: popularne
 * miejsca są już w pamięci, zanim ktokolwiek zdąży czekać na sieć.
 */
export function usePlaceSearch(query: string) {
  const { filterLocal } = usePopularPlaces();
  const [remote, setRemote] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const local = useMemo(() => filterLocal(query), [filterLocal, query]);

  useEffect(() => {
    if (query.trim().length < MIN_SERVER_QUERY) {
      setRemote([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(() => {
      searchPlaces(query.trim(), controller.signal)
        .then((rows) => {
          if (!controller.signal.aborted) setRemote(rows);
        })
        // Przerwane żądanie to nie awaria, tylko kolejny naciśnięty klawisz.
        // Padnięty serwer też nie: lista lokalna została i wciąż działa.
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const results = useMemo(() => {
    const seen = new Set(local.map((place) => place.id));
    return [...local, ...remote.filter((place) => !seen.has(place.id))];
  }, [local, remote]);

  return { results, loading };
}
