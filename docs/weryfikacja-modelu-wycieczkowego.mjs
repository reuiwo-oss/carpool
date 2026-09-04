/**
 * Scenariusz weryfikacyjny modelu wycieczkowego — osiem kroków z planu
 * migracji, jako lista żądań HTTP do działającego API.
 *
 * Uruchomienie (API musi działać na localhost:3000):
 *     node docs/weryfikacja-modelu-wycieczkowego.mjs
 *
 * Skrypt zakłada trzy konta z losowym adresem e-mail i po sobie nie sprząta —
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

const register = async (name) => {
  const res = await call('POST', '/auth/register', {
    body: { email: `${name}.${stamp}@example.test`, password: 'haslo12345', name },
  });
  if (res.status !== 201) throw new Error(`rejestracja ${name}: ${JSON.stringify(res)}`);
  return { token: res.body.accessToken, id: res.body.user.id, name };
};

const rolesOf = (trip, userId) =>
  trip.participants.find((p) => p.userId === userId)?.roles ?? null;

// ── 1. Rejestracja bez roli ──────────────────────────────────────────────────
const a = await register('Ala');
const b = await register('Bartek');
const c = await register('Celina');
check('konto A bez pola role', Object.keys((await call('GET', '/users/me', { token: a.token })).body).sort(), ['email', 'id']);

// ── 2. A dodaje pojazd i publikuje wycieczkę z dwoma odcinkami ───────────────
const vehicleA = await call('POST', '/vehicles', {
  token: a.token,
  body: { make: 'Škoda', model: 'Octavia', interior: 'sedan' },
});
check('POST /vehicles', vehicleA.status, 201);

const created = await call('POST', '/trips', {
  token: a.token,
  body: {
    title: 'Weekend w Tatrach',
    destination: 'Zakopane',
    startsAt: iso(7, 8),
    endsAt: iso(9, 18),
  },
});
check('POST /trips', created.status, 201);
const tripId = created.body.id;

const rideA = await call('POST', `/trips/${tripId}/rides`, {
  token: a.token,
  body: {
    vehicleId: vehicleA.body.id,
    legs: [
      { direction: 'OUTBOUND', origin: 'Kraków, Rondo Mogilskie', departureAt: iso(7, 6) },
      { direction: 'RETURN', origin: 'Zakopane, Dworzec', departureAt: iso(9, 16), arrivalAt: iso(9, 19) },
    ],
  },
});
check('POST /trips/:id/rides', rideA.status, 201);

let trip = (await call('GET', `/trips/${tripId}`, { token: a.token })).body;
check('A jest ORGANIZER i DRIVER', rolesOf(trip, a.id), ['ORGANIZER', 'DRIVER']);
check('startsAt przeliczony z odcinka OUTBOUND', trip.startsAt, iso(7, 6));
check('endsAt przeliczony z arrivalAt odcinka RETURN', trip.endsAt, iso(9, 19));

// ── 3. B dołącza — szuka miejsca ─────────────────────────────────────────────
check('POST /trips/:id/join', (await call('POST', `/trips/${tripId}/join`, { token: b.token })).status, 201);
trip = (await call('GET', `/trips/${tripId}`, { token: b.token })).body;
check('B jest LOOKING_FOR_SEAT', rolesOf(trip, b.id), ['LOOKING_FOR_SEAT']);

// ── 4. B rezerwuje fotel ─────────────────────────────────────────────────────
const seat = trip.rides[0].seats.find((s) => s.status === 'FREE');
const reservation = await call('POST', `/trips/${tripId}/rides/${rideA.body.id}/reservations`, {
  token: b.token,
  body: { seatId: seat.id, note: 'Będę miał duży plecak' },
});
check('POST rezerwacji', reservation.status, 201);
check('fotel zajęty na obu odcinkach', reservation.body.legs, 'BOTH');
check('prośba założyła wątek', typeof reservation.body.conversationId, 'string');

trip = (await call('GET', `/trips/${tripId}`, { token: b.token })).body;
check('B jest PASSENGER', rolesOf(trip, b.id), ['PASSENGER']);

// ── 5. C dołącza z własnym autem ─────────────────────────────────────────────
await call('POST', `/trips/${tripId}/join`, { token: c.token });
const vehicleC = await call('POST', '/vehicles', {
  token: c.token,
  body: { make: 'Toyota', model: 'Corolla', interior: 'sedan' },
});
const rideC = await call('POST', `/trips/${tripId}/rides`, {
  token: c.token,
  body: {
    vehicleId: vehicleC.body.id,
    legs: [{ direction: 'OUTBOUND', origin: 'Kraków, Bronowice', departureAt: iso(7, 7) }],
  },
});
check('drugie auto w wycieczce', rideC.status, 201);
trip = (await call('GET', `/trips/${tripId}`, { token: c.token })).body;
check('C jest DRIVER', rolesOf(trip, c.id), ['DRIVER']);
check('wycieczka ma dwa auta', trip.rides.length, 2);
check('freeSeats sumuje oba auta', trip.freeSeats, 7);

// ── 6. B próbuje drugiego fotela w aucie A ───────────────────────────────────
const second = trip.rides.find((r) => r.id === rideA.body.id).seats.find((s) => s.status === 'FREE');
check(
  'drugi fotel dla tej samej osoby → 409',
  (await call('POST', `/trips/${tripId}/rides/${rideA.body.id}/reservations`, {
    token: b.token,
    body: { seatId: second.id },
  })).status,
  409,
);

// ── 7. Uprawnienia do usuwania aut ───────────────────────────────────────────
check(
  'C usuwa auto A → 403',
  (await call('DELETE', `/trips/${tripId}/rides/${rideA.body.id}`, { token: c.token })).status,
  403,
);
check(
  'A (organizator) usuwa auto C → 200',
  (await call('DELETE', `/trips/${tripId}/rides/${rideC.body.id}`, { token: a.token })).status,
  200,
);

// ── 8. Moje wycieczki ────────────────────────────────────────────────────────
const mine = (await call('GET', '/trips/mine', { token: b.token })).body;
const row = mine.upcoming.find((t) => t.id === tripId);
check('wycieczka w upcoming', Boolean(row), true);
check('z rolą PASSENGER', row.myRoles, ['PASSENGER']);

// ── Wątek wiadomości przeżył zmianę modelu ───────────────────────────────────
const threads = (await call('GET', '/conversations', { token: a.token })).body;
const thread = threads.find((t) => t.tripId === tripId);
check('kierowca widzi wątek', Boolean(thread), true);
check('wątek zna wycieczkę', thread.trip.title, 'Weekend w Tatrach');
check('wątek zna stan rezerwacji', thread.reservationStatus, 'PENDING');
check('notatka pasażera w wątku', thread.lastMessage.body, 'Będę miał duży plecak');
check(
  'potwierdzenie z wątku',
  (await call('POST', `/reservations/${thread.reservationId}/accept`, { token: a.token })).status,
  201,
);

console.log(failures === 0 ? '\nScenariusz przeszedł w całości.' : `\nBłędów: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
