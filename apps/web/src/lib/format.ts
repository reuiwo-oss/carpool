/**
 * Formatowanie dat i liczebników po polsku.
 *
 * Bez Intl.RelativeTimeFormat i bez bibliotek dat — potrzebujemy dokładnie
 * tych kilku form, które pokazuje projekt, a odmiana miesięcy i liczebników
 * po polsku i tak wymaga własnych tablic.
 */

const PL_MONTHS = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];
const PL_WEEKDAYS = ['nd.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Klucz dnia „YYYY-MM-DD" w czasie lokalnym — do filtrowania i chipów. */
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export interface When {
  /** „sob., 12 września" */
  day: string;
  /** „sob., 12 wrz" */
  dayShort: string;
  /** „08:30" */
  time: string;
  /** „2026-09-12" */
  key: string;
}

export function formatWhen(value: string | Date): When {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return { day: '—', dayShort: '—', time: '—', key: '' };
  const wd = PL_WEEKDAYS[d.getDay()];
  const month = PL_MONTHS[d.getMonth()];
  return {
    day: `${wd}, ${d.getDate()} ${month}`,
    dayShort: `${wd}, ${d.getDate()} ${month.slice(0, 3)}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    key: dateKey(d),
  };
}

/** Inicjały do awatara zastępczego: „Anna Kowalska" → „AK". */
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * Polska odmiana przez liczbę: 1 przejazd, 2–4 przejazdy, 5+ przejazdów.
 * Wyjątek na 12–14, które mimo końcówki 2–4 biorą formę mnogą dopełniaczową.
 */
export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const last = n % 10;
  const lastTwo = n % 100;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return few;
  return many;
}

export const ridesCount = (n: number) => `${n} ${plural(n, 'przejazd', 'przejazdy', 'przejazdów')}`;

/** Chipy dnia: „Wszystkie" + trzy najbliższe dni, liczone od dzisiaj. */
export function nextDayChips(count = 3) {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const { dayShort, key } = formatWhen(d);
    return { key, label: dayShort };
  });
}

/** Wartość dla <input type="datetime-local"> — lokalna, bez strefy. */
export function toDatetimeLocal(d: Date) {
  return `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
