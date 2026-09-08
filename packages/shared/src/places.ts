/**
 * Baza nazw geograficznych: szczyty, pasma, przełęcze, miejscowości, regiony.
 *
 * Typ miejsca jest tylko etykietą przy podpowiedzi — pole wyszukiwania jest
 * jedno dla wszystkich typów. Rolę („dokąd" kontra „skąd startujemy") niesie
 * pole w formularzu, nie typ miejsca.
 */

export type PlaceType = 'PEAK' | 'RANGE' | 'PASS' | 'TOWN' | 'REGION';

/** Etykiety po polsku — jedno źródło dla podpowiedzi i dla ekranu wycieczki. */
export const PLACE_TYPE_LABEL: Record<PlaceType, string> = {
  PEAK: 'szczyt',
  RANGE: 'pasmo',
  PASS: 'przełęcz',
  TOWN: 'miejscowość',
  REGION: 'region',
};

/** Miejsce w podpowiedzi — to, co zwracają `/places/popular` i `/places/search`. */
export interface PlaceSuggestion {
  id: string;
  name: string;
  type: PlaceType;
  parentId: string | null;
  parentName: string | null;
  lat: number;
  lng: number;
  aliases: string[];
  popularity: number;
  /**
   * Powiat — odróżnia miejsca o tej samej nazwie i wchodzi do drugiej linijki
   * podpowiedzi wszędzie tam, gdzie miejsce nie ma rodzica.
   */
  region: string | null;
}

/**
 * Wskazanie miejsca w formularzu. `placeId: null` to własna nazwa użytkownika:
 * „Chatka u Zbyszka" nigdy nie trafi do rejestru nazw geograficznych, a mimo
 * to musi dać się wpisać jako cel.
 */
export type PlaceRef = { placeId: string; name: string } | { placeId: null; name: string };

/** Miejsce dopięte do wycieczki — tyle, ile trzeba, żeby je wyświetlić. */
export interface TripPlace {
  id: string;
  name: string;
  type: PlaceType;
  parentName: string | null;
  region: string | null;
}

/**
 * Druga linijka podpowiedzi: „szczyt · Beskid Żywiecki", „miejscowość ·
 * pow. tatrzański".
 *
 * Dla gór ciekawsze jest pasmo — mówi, dokąd się idzie. Dla miejscowości
 * odwrotnie: pasmo jest tylko luźnym sąsiedztwem, a powiat naprawdę odróżnia
 * dwa Międzygórza od siebie.
 */
export function placeSubtitle(place: {
  type: PlaceType;
  parentName?: string | null;
  region?: string | null;
}): string {
  const context =
    place.type === 'TOWN'
      ? place.region ?? place.parentName
      : place.parentName ?? place.region;

  return context ? `${PLACE_TYPE_LABEL[place.type]} · ${context}` : PLACE_TYPE_LABEL[place.type];
}
