
# Carpool — wspólne wycieczki jednym samochodem

Uczestnicy organizują wspólny wyjazd, zgłaszają do niego swoje auta i graficznie
wybierają wolne miejsca. Kto jest kierowcą, a kto pasażerem, wynika z tego, co
kto wniósł do konkretnej wycieczki — nie z ustawienia konta.

## Struktura monorepo

```
apps/
  api/        — backend NestJS + Prisma + PostgreSQL
  web/        — frontend React + Vite
packages/
  shared/     — typy i logika współdzielona (web dziś, React Native jutro)
```

## Uruchomienie (dev)

Wszystkie komendy z katalogu głównego repo.

**1. Postgres**

```bash
docker compose up -d
```

**2. Zależności**

```bash
npm install
```

**3. Zmienne środowiskowe**

```bash
cp apps/api/.env.example apps/api/.env      # PowerShell: Copy-Item apps\api\.env.example apps\api\.env
```

**4. Migracje bazy**

```bash
npm run db:migrate
```

**5. Start — w dwóch osobnych terminalach**

```bash
npm run dev:api     # NestJS na http://localhost:3000 (prefiks /api)
npm run dev:web     # Vite na http://localhost:5173, proxuje /api na port 3000
```

Oba skrypty budują najpierw `packages/shared`, więc nie trzeba tego robić ręcznie.

## Pozostałe komendy

```bash
npm run build:shared                              # jednorazowy build pakietu shared
npm run build --workspace packages/shared -- --watch   # watch przy pracy nad shared
npm run build --workspace apps/api                # produkcyjny build API
npm run prisma:generate --workspace apps/api      # regeneracja klienta Prisma po zmianie schematu
npm test                                          # testy jednostkowe pakietu shared
node docs/weryfikacja-modelu-wycieczkowego.mjs    # scenariusz end-to-end na działającym API
```

> Przy edycji `packages/shared` trzymaj watch w osobnym terminalu — bez tego API
> będzie korzystać z nieaktualnej kopii pakietu.

> `npm run dev:web` bez działającego API zwraca w przeglądarce 500 na każde
> żądanie `/api/*` — tak proxy Vite sygnalizuje nieosiągalny backend.
> Szczegóły: [docs/bugfix-2026-09-01-rejestracja-500.md](docs/bugfix-2026-09-01-rejestracja-500.md).

## Model danych

Jednostką nie jest przejazd, tylko **wycieczka** — wspólny wyjazd w obie strony
tym samym składem.

- **Wycieczka** (`Trip`) — cel, opis, widoczność i status. Ramy czasowe
  (`startsAt`, `endsAt`) nie są przepisywane z formularza: wyliczają się
  z odcinków aut, więc wycieczka zaczyna się, gdy rusza pierwsze auto, a kończy,
  gdy wróci ostatnie.
- **Uczestnik** (`TripParticipant`) — kto jest w wycieczce. Jedyne zapisane
  pole poza datą dołączenia to `isOrganizer`.
- **Auto** (`Ride`) — samochód zgłoszony do wycieczki, jeden na uczestnika.
  Każdy uczestnik może dodać własny; organizator niczego nie zatwierdza.
  W chwili zgłoszenia auto kopiuje układ foteli z pojazdu
  (`seatLayoutSnapshot`), żeby późniejsza zmiana w garażu nie przestawiała
  miejsc ludziom, którzy już je zajęli.
- **Odcinek** (`RideLeg`) — `OUTBOUND` i `RETURN`: godzina i miejsce zbiórki
  osobno na dojazd i na powrót. Auto należy do całej wycieczki, nie do
  pojedynczego kursu, więc jeden samochód ma dwa odcinki zamiast dwóch
  osobnych przejazdów.
- **Rezerwacja** (`SeatReservation`) — fotel w konkretnym aucie, domyślnie na
  oba odcinki. Prośba blokuje miejsce od razu, ale pasażer jedzie dopiero po
  potwierdzeniu przez kierowcę tego auta.
- **Pojazd** (`Vehicle`) — garaż użytkownika, niezależny od wycieczek.
- **Prośba o przejazd** (`RideRequest`) — „chcę jechać, ale nie ma jeszcze
  takiej wycieczki". Celowo bez powiązania z wycieczką: uczestnik wycieczki
  bez miejsca sam w sobie jest sygnałem zapotrzebowania.

### Role wyliczane

Konto nie ma roli. Rola dotyczy zawsze **konkretnej wycieczki** i wynika
z danych — liczy ją `deriveParticipantRoles` z pakietu `shared`, tą samą
funkcją po stronie API i frontendu:

| rola | skąd się bierze |
|---|---|
| `ORGANIZER` | `isOrganizer` na uczestnictwie |
| `DRIVER` | ma w tej wycieczce auto |
| `PASSENGER` | ma rezerwację miejsca |
| `LOOKING_FOR_SEAT` | jest uczestnikiem, ale nie ma ani auta, ani fotela |

Role się nie wykluczają: organizator, który zgłosił własne auto, jest
jednocześnie `ORGANIZER` i `DRIVER`. Ta sama osoba bywa kierowcą w jednej
wycieczce i pasażerem w następnej — dlatego rejestracja o rolę nie pyta.
