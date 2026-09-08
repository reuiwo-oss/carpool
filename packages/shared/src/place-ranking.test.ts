import { describe, expect, it } from 'vitest';
import type { PlaceSuggestion } from './places';
import { rankPlaces } from './place-ranking';

/** Skrót do budowania podpowiedzi — testy interesuje nazwa, typ i popularność. */
const place = (
  name: string,
  type: PlaceSuggestion['type'],
  popularity: number,
  aliases: string[] = [],
): PlaceSuggestion => ({
  id: name,
  name,
  type,
  parentId: null,
  parentName: null,
  lat: 0,
  lng: 0,
  aliases,
  popularity,
  region: null,
});

const PLACES: PlaceSuggestion[] = [
  place('Babia Góra', 'PEAK', 100, ['Diablak']),
  place('Babice', 'TOWN', 0),
  place('Babia Grapa', 'PEAK', 0),
  place('Beskid Sądecki', 'RANGE', 90),
  place('Sądkowa', 'TOWN', 0),
  place('Rabka-Zdrój', 'TOWN', 80),
  place('Zakopane', 'TOWN', 80),
  place('Łysica', 'PEAK', 100),
];

const names = (query: string) => rankPlaces(PLACES, query).map((p) => p.name);

describe('rankPlaces', () => {
  it('„bab" zwraca Babią Górę przed Babicami', () => {
    const result = names('bab');
    expect(result).toContain('Babia Góra');
    expect(result.indexOf('Babia Góra')).toBeLessThan(result.indexOf('Babice'));
  });

  /**
   * Wszystkie trzy zaczynają się od „bab", więc waga jest równa i rozstrzyga
   * popularność — inaczej alfabet wypchnąłby Babią Grapę przed Babią Górę.
   */
  it('przy równej wadze decyduje popularność', () => {
    expect(names('babia')).toEqual(['Babia Góra', 'Babia Grapa']);
  });

  it('„sąd" znajduje Beskid Sądecki po drugim słowie', () => {
    expect(names('sąd')).toContain('Beskid Sądecki');
  });

  it('„sad" bez ogonka szuka tak samo jak „sąd"', () => {
    expect(names('sad')).toEqual(names('sąd'));
  });

  it('„diab" znajduje Babią Górę przez alias', () => {
    expect(names('diab')).toEqual(['Babia Góra']);
  });

  it('„zdroj" trafia w człon po myślniku', () => {
    expect(names('zdroj')).toContain('Rabka-Zdrój');
  });

  it('trafienie w początek nazwy bije trafienie w dalsze słowo', () => {
    const result = names('sa');
    expect(result.indexOf('Sądkowa')).toBeLessThan(result.indexOf('Beskid Sądecki'));
  });

  it('„lys" znajduje Łysicę mimo ł', () => {
    expect(names('lys')).toEqual(['Łysica']);
  });

  it('puste zapytanie nie zwraca niczego — lista ma się pokazać dopiero po wpisaniu', () => {
    expect(names('')).toEqual([]);
    expect(names('   ')).toEqual([]);
  });

  it('brak trafień to pusta lista, a nie cała baza', () => {
    expect(names('xyz')).toEqual([]);
  });
});
