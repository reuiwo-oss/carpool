/**
 * Normalizacja nazw miejsc do postaci, po której szukamy.
 *
 * Ta sama funkcja liczy `nameNorm` przy imporcie do bazy i filtruje listę
 * popularnych miejsc w kliencie. Gdyby liczyły to dwie implementacje, prędzej
 * czy później rozjechałyby się na jakimś znaku i „Śnieżka" znalazłaby się
 * po stronie serwera, a po stronie klienta nie.
 */

/**
 * Polskie „ł" jest osobnym znakiem Unicode (U+0142), a nie „l" z kreską —
 * NFD go nie rozkłada, więc sam `normalize('NFD')` zostawiłby „łysica".
 * Te litery trzeba wymienić jawnie.
 */
const LIGATURES: Record<string, string> = { ł: 'l', Ł: 'L', đ: 'd', Đ: 'D', ß: 'ss' };

/**
 * Małe litery, bez diakrytyków, bez zdwojonych spacji.
 * „Śnieżka" → „sniezka", „Krościenko nad Dunajcem" → „kroscienko nad dunajcem".
 */
export function normalizeName(value: string): string {
  return value
    .replace(/[łŁđĐß]/g, (letter) => LIGATURES[letter] ?? letter)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
