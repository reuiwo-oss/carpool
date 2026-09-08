import { describe, expect, it } from 'vitest';
import { normalizeName } from './normalize';

describe('normalizeName', () => {
  it('zdejmuje diakrytyki', () => {
    expect(normalizeName('Śnieżka')).toBe('sniezka');
    expect(normalizeName('Ślęża')).toBe('sleza');
  });

  /**
   * Sedno sprawy: „ł" nie jest „l" z kreską diakrytyczną, tylko osobnym znakiem
   * Unicode. NFD go nie rozkłada, więc bez jawnej podmiany zostawałoby „łysica"
   * i nikt nie znalazłby Łysicy, wpisując „lysica".
   */
  it('zamienia ł, którego NFD nie rozkłada', () => {
    expect(normalizeName('Łysica')).toBe('lysica');
    expect(normalizeName('Łomnica')).toBe('lomnica');
    expect(normalizeName('Biała Woda')).toBe('biala woda');
  });

  it('zachowuje pojedyncze spacje w nazwach wielowyrazowych', () => {
    expect(normalizeName('Krościenko nad Dunajcem')).toBe('kroscienko nad dunajcem');
  });

  it('ściąga zdwojone spacje i obcina brzegi', () => {
    expect(normalizeName('  Babia   Góra  ')).toBe('babia gora');
  });

  it('zostawia myślnik — to część nazwy, nie separator do wyrzucenia', () => {
    expect(normalizeName('Rabka-Zdrój')).toBe('rabka-zdroj');
  });

  it('jest idempotentna: znormalizowane wchodzi i wychodzi bez zmian', () => {
    const once = normalizeName('Świeradów-Zdrój');
    expect(normalizeName(once)).toBe(once);
  });
});
