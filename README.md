
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
npm test --workspace apps/api                     # testy wyszukiwarki miejsc (wymagają bazy z seedem)
node docs/weryfikacja-modelu-wycieczkowego.mjs    # scenariusz end-to-end na działającym API
```

> Przy edycji `packages/shared` trzymaj watch w osobnym terminalu — bez tego API
> będzie korzystać z nieaktualnej kopii pakietu.

> `npm run dev:web` bez działającego API zwraca w przeglądarce 500 na każde
> żądanie `/api/*` — tak proxy Vite sygnalizuje nieosiągalny backend.
> Szczegóły: [docs/bugfix-2026-09-01-rejestracja-500.md](docs/bugfix-2026-09-01-rejestracja-500.md).

## Baza miejsc

Cel wycieczki nie jest zwykłym polem tekstowym: podpowiada się z bazy nazw
geograficznych, a wybrane miejsce zna swoje pasmo — dlatego wyszukiwanie po
Tatrach znajduje też wyjazdy na Rysy. Własną nazwę („Chatka u Zbyszka") wciąż
można wpisać z ręki; wtedy wycieczka zapisuje samą nazwę, bez powiązania.

### Skąd wziąć dane

Dane pochodzą z **Państwowego Rejestru Nazw Geograficznych** (PRNG), dostępnego
w [dane.gov.pl](https://dane.gov.pl). Potrzebne są dwa zbiory, oba w formacie
**SHP** (shapefile):

- `PRNG_OBIEKTY_FIZJOGRAFICZNE_SHP` — szczyty, pasma, przełęcze, regiony,
- `PRNG_MIEJSCOWOSCI_SHP` — miasta i wsie.

Rozpakuj je gdziekolwiek w `apps/api/prisma/data/` — skrypt sam znajdzie każdy
plik `.shp` w tym katalogu wraz z podkatalogami. Komplet to zawsze cztery pliki
o tej samej nazwie: `.shp` (geometria), `.dbf` (atrybuty), `.shx` (indeks)
i `.prj` (układ współrzędnych). Katalog jest w `.gitignore` — same `.dbf` mają
po półtora giga.

### Kolejność uruchamiania

```bash
npm run places:import  --workspace apps/api   # PRNG → tabela Place (kilka minut)
npm run places:popular --workspace apps/api   # lista popularnych: popularity, aliasy, rodzice
```

Kolejność ma znaczenie: drugi skrypt dopina się do rekordów utworzonych przez
pierwszy. Oba są idempotentne, więc powtórne uruchomienie niczego nie dubluje —
import po dorzuceniu nowego pliku PRNG dołoży tylko to, czego jeszcze nie ma.

Zanim napiszesz cokolwiek pod nowy plik, warto zajrzeć do środka:

```bash
npm run places:import --workspace apps/api -- --inspect
```

Wypisze nagłówki kolumn i wszystkie wartości pola „rodzaj obiektu" z liczebnością
oraz z zaznaczeniem, które z nich skrypt aktualnie mapuje na własny typ miejsca.

### Jak działa import

- Bierzemy wyłącznie wiersze z `rodzajRepr = "punkt główny"`. Jeden obiekt PRNG
  ma kilka punktów (dodatkowe, początkowy i końcowy dla rzek) i dopiero po tym
  zawężeniu `idPRNG` jest unikalny — on jest kluczem idempotencji
  (`source = "prng:<idPRNG>"`).
- Współrzędne liczymy z geometrii `.shp` przez `proj4`, z PL-1992 (EPSG:2180)
  na WGS84. Tekstowa kolumna `wspGeograf` ma dokładność sekundy kątowej,
  czyli jakichś 30 metrów.
- Miejscowości ograniczamy do prostokąta obejmującego polskie góry
  (49–51° N, 15–23° E). Każda wieś z Mazowsza tylko rozmywałaby podpowiedzi.
- `elevation` zostaje prawie zawsze puste: PRNG nie ma kolumny z wysokością.
  Bierzemy ją tylko stamtąd, gdzie ktoś wpisał ją w opis obiektu.
- Import **nie rusza** `popularity` ani `parentId` — te należą do listy
  popularnych miejsc i ponowny import nie ma prawa ich cofnąć.

### Jak dodać miejsce do listy popularnych

Lista mieszka w [`apps/api/prisma/data/places.seed.json`](apps/api/prisma/data/places.seed.json)
i jest jedynym plikiem, który się w tym celu edytuje. Wpis wygląda tak:

```json
{ "name": "Babia Góra", "type": "PEAK", "parent": "Beskid Żywiecki", "popularity": 100, "aliases": ["Diablak"] }
```

Współrzędnych **nie wpisuje się ręcznie** — dokłada je dopasowanie do PRNG.
Skrypt szuka po nazwie głównej i po nazwach obocznych, w obie strony: rejestr
zapisuje „Przełęcz Okraj" jako „Okraj", a „Luboń Wielki" jako „Luboń", więc
krótszą formę wystarczy podać w `aliases`. Gdy nazw pasuje kilka (samych
„Babich Gór" jest w Polsce kilkanaście), wygrywa ta najbliższa rodzicowi —
dlatego rodzic musi być na liście wcześniej.

Umownie: pasma i regiony `90`, Korona Gór Polski `100`, inne znane szczyty
`70`, miejscowości wypadowe `80`, przełęcze `50`. Liczba steruje tylko
kolejnością podpowiedzi; `0` znaczy „tylko w pełnej bazie, wyszukiwane
na serwerze".

Po edycji uruchom `places:popular` i przeczytaj raport: pokaże dopasowane,
utworzone ręcznie, **niedopasowane** i konflikty. Lista jest deklaracją stanu —
skreślenie wpisu zdejmuje miejsce z popularnych przy najbliższym przebiegu.

Miejsca, którego nie ma w PRNG (jak Sudety — rejestr zna tylko kawałek lasu
o tej nazwie), skrypt utworzy sam ze `source: "manual"`, biorąc współrzędne
ze środka ciężkości jego dzieci. Jeśli dzieci nie ma, wypisze wpis jako
niedopasowany i **nie** utworzy rekordu bez współrzędnych.

## Model danych

Jednostką nie jest przejazd, tylko **wycieczka** — wspólny wyjazd w obie strony
tym samym składem.

- **Miejsce** (`Place`) — nazwa geograficzna z PRNG albo dopisana ręcznie:
  szczyt, pasmo, przełęcz, miejscowość, region. Hierarchia (szczyt → pasmo →
  region) jest płytka i ustawiana tylko dla listy popularnych — PRNG nie mówi,
  w którym paśmie leży szczyt. Wycieczka wskazuje dwa miejsca o różnych
  **rolach**, nie typach: `destinationPlace` (dokąd) i `basePlace`
  (skąd atakujemy). Patrz [Baza miejsc](#baza-miejsc).
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
