/**
 * Scenariusz weryfikacyjny bazy miejsc — punkty z planu, jako lista żądań HTTP
 * do działającego API.
 *
 * Uruchomienie (API musi działać na localhost:3000, baza po places:import
 * i places:popular):
 *     node docs/weryfikacja-bazy-miejsc.mjs
 *
 * Skrypt zakłada jedno konto z losowym adresem e-mail i po sobie nie sprząta —
 * jest do puszczania na bazie deweloperskiej.
 */
const BASE = 'http://localhost:3000/api';
const stamp = Date.now();
let failures = 0;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(
    `${ok ? 'OK  ' : 'FAIL'}  ${label}: ${JSON.stringify(actual)}` +
      (ok ? '' : ` (oczekiwano ${JSON.stringify(expected)})`),
  );
}

const iso = (days, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

// ── 1. Podpowiedzi działają bez logowania ───────────────────────────────────
const bab = await call('GET', '/places/search?q=bab&limit=5');
check('GET /places/search?q=bab bez tokenu', bab.status, 200);
check('pierwsza podpowiedź dla „bab"', bab.body[0].name, 'Babia Góra');
check('z pasmem w tle', bab.body[0].parentName, 'Beskid Żywiecki');

const zakop = await call('GET', '/places/search?q=zakop&limit=5');
check('pierwsza podpowiedź dla „zakop"', zakop.body[0].name, 'Zakopane');
check('Zakopane z etykietą powiatu', zakop.body[0].region, 'pow. tatrzański');

// Literówka: „snierz" zamiast „snieżk" — ratuje nas similarity() z pg_trgm.
const typo = await call('GET', '/places/search?q=snierz&limit=5');
check('literówka „snierz" znajduje Śnieżkę', typo.body.some((p) => p.name === 'Śnieżka'), true);

const popular = await call('GET', '/places/popular');
check('GET /places/popular bez tokenu', popular.status, 200);
check('lista popularnych niepusta', popular.body.length > 100, true);

// ── 2. Konto i pojazd — potrzebne, żeby wycieczka miała komplet ─────────────
const registered = await call('POST', '/auth/register', {
  body: { email: `miejsca.${stamp}@example.test`, password: 'haslo12345', name: 'Ala' },
});
if (registered.status !== 201) throw new Error(`rejestracja: ${JSON.stringify(registered)}`);
const token = registered.body.accessToken;

// ── 3. Wycieczka z celem „Rysy" ─────────────────────────────────────────────
const rysy = popular.body.find((p) => p.name === 'Rysy');
const tatry = popular.body.find((p) => p.name === 'Tatry' && p.type === 'RANGE');
const zakopane = popular.body.find((p) => p.name === 'Zakopane');
check('Rysy są na liście popularnych', Boolean(rysy), true);
check('Rysy mają rodzica', rysy.parentName, 'Tatry');

const naRysy = await call('POST', '/trips', {
  token,
  body: {
    title: `Rysy ${stamp}`,
    destination: rysy.name,
    destinationPlaceId: rysy.id,
    baseName: zakopane.name,
    basePlaceId: zakopane.id,
    startsAt: iso(7, 6),
    endsAt: iso(8, 20),
  },
});
check('POST /trips z miejscem z bazy', naRysy.status, 201);

// ── 4. Wycieczka z własnym celem, bez placeId ───────────────────────────────
const wlasny = await call('POST', '/trips', {
  token,
  body: {
    title: `Chatka ${stamp}`,
    destination: 'Chatka u Zbyszka',
    startsAt: iso(7, 7),
    endsAt: iso(8, 21),
  },
});
check('POST /trips z własną nazwą celu', wlasny.status, 201);

const szczegoly = (await call('GET', `/trips/${wlasny.body.id}`, { token })).body;
check('własna nazwa w szczegółach', szczegoly.destination, 'Chatka u Zbyszka');
check('własna nazwa bez powiązanego miejsca', szczegoly.destinationPlace, null);

const naLiscie = (await call('GET', '/trips', { token })).body;
check(
  'własny cel widać na liście',
  naLiscie.some((t) => t.id === wlasny.body.id && t.destination === 'Chatka u Zbyszka'),
  true,
);

// ── 5. Filtr po miejscu: wyjazd na Rysy wychodzi spod Tatr ──────────────────
const wTatrach = (await call('GET', `/trips?placeId=${tatry.id}`, { token })).body;
check(
  'wycieczka na Rysy jest w GET /trips?placeId=<Tatry>',
  wTatrach.some((t) => t.id === naRysy.body.id),
  true,
);
check(
  'wycieczka z własnym celem nie wpada w filtr',
  wTatrach.some((t) => t.id === wlasny.body.id),
  false,
);

// Rodzic działa w drugą stronę: kto szuka Rys, widzi też wyjazdy „w Tatry".
const naSzczyt = (await call('GET', `/trips?placeId=${rysy.id}`, { token })).body;
check(
  'filtr po Rysach też znajduje tę wycieczkę',
  naSzczyt.some((t) => t.id === naRysy.body.id),
  true,
);

// ── 6. Szczegóły wycieczki znają cel i bazę ─────────────────────────────────
const rysyTrip = (await call('GET', `/trips/${naRysy.body.id}`, { token })).body;
check('cel z bazy miejsc', rysyTrip.destinationPlace.name, 'Rysy');
check('cel zna swoje pasmo', rysyTrip.destinationPlace.parentName, 'Tatry');
check('baza wycieczki', rysyTrip.basePlace.name, 'Zakopane');
check('baza zna powiat', rysyTrip.basePlace.region, 'pow. tatrzański');

// ── 7. Prośba o przejazd też przyjmuje miejsce ──────────────────────────────
const prosba = await call('POST', '/ride-requests', {
  token,
  body: {
    destination: rysy.name,
    destinationPlaceId: rysy.id,
    dateFrom: iso(7, 0),
    dateTo: iso(9, 0),
  },
});
check('POST /ride-requests z miejscem', prosba.status, 201);
const prosby = (await call('GET', '/ride-requests', { token })).body;
check(
  'prośba zna miejsce',
  prosby.find((r) => r.id === prosba.body.id)?.destinationPlace?.name,
  'Rysy',
);

// ── 8. Hierarchia w dół ─────────────────────────────────────────────────────
const potomkowie = (await call('GET', `/places/${tatry.id}/descendants`)).body;
check('Rysy są potomkiem Tatr', potomkowie.includes(rysy.id), true);
check('Tatry nie są własnym potomkiem', potomkowie.includes(tatry.id), false);

console.log(failures === 0 ? '\nScenariusz przeszedł w całości.' : `\nBłędów: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
