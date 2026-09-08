import { normalizeName } from './normalize.js';
import type { PlaceSuggestion } from './places.js';

/**
 * Ranking podpowiedzi liczony w pamięci, na krótkiej liście popularnych miejsc.
 *
 * Wagi są te same co w SQL-u po stronie serwera (`PlacesService.search`),
 * z jednym świadomym brakiem: przeglądarka nie ma trigramów, więc zamiast
 * `similarity()` najluźniejsza waga to zwykłe „zawiera". Literówki wyłapie
 * dopiero serwer i jego wyniki dokleją się pod spodem.
 *
 * Ta sama funkcja `normalizeName` co przy imporcie do bazy — inaczej „Śnieżka"
 * znajdowałaby się po stronie serwera, a po stronie klienta nie.
 */

/** Trafienie w początek nazwy bije wszystko inne. */
const STARTS_WITH_NAME = 3;
/** Początek dalszego słowa nazwy albo początek nazwy obocznej. */
const STARTS_WITH_WORD = 2;
/** Gdziekolwiek w nazwie — ostatnia deska ratunku. */
const CONTAINS = 1;

function weightOf(place: PlaceSuggestion, query: string): number {
  const name = normalizeName(place.name);
  if (name.startsWith(query)) return STARTS_WITH_NAME;

  // Myślnik dzieli nazwę tak samo jak spacja: „Rabka-Zdrój" ma się znaleźć
  // pod „zdroj".
  if (name.split(/[\s-]+/).some((word) => word.startsWith(query))) return STARTS_WITH_WORD;

  if (place.aliases.some((alias) => normalizeName(alias).startsWith(query))) {
    return STARTS_WITH_WORD;
  }

  return name.includes(query) ? CONTAINS : 0;
}

/**
 * Miejsca pasujące do zapytania, od najlepszego trafienia. Wewnątrz wagi
 * decyduje popularność, a przy równej — alfabet.
 */
export function rankPlaces(places: PlaceSuggestion[], rawQuery: string): PlaceSuggestion[] {
  const query = normalizeName(rawQuery);
  if (!query) return [];

  return places
    .map((place) => ({ place, weight: weightOf(place, query) }))
    .filter((row) => row.weight > 0)
    .sort(
      (a, b) =>
        b.weight - a.weight ||
        b.place.popularity - a.place.popularity ||
        a.place.name.localeCompare(b.place.name, 'pl'),
    )
    .map((row) => row.place);
}
