# Zadanie: baza miejsc (góry, pasma, miejscowości) i komponent PlacePicker

Pracujesz w monorepo Carpool (`apps/api` — NestJS + Prisma + PostgreSQL, `apps/web` — React + Vite,
`packages/shared`). Model danych jest już oparty na wycieczkach (`Trip`, `Ride`, `RideLeg`,
`SeatReservation`, `RideRequest`). Zadanie: dodać bazę nazw geograficznych z autouzupełnianiem
i podpiąć ją pod pola celu wycieczki.

Pracuj etapami. Po każdym etapie zatrzymaj się, podsumuj i poczekaj na moje potwierdzenie.

## Zasady pracy

- Przeczytaj `schema.prisma`, moduł `trips`, `packages/shared/src` i formularze w `apps/web/src/pages`,
  zanim cokolwiek zmienisz.
- Gałąź `feat/places-autocomplete`, jeden commit na etap.
- Migracje wyłącznie przez `prisma migrate dev --name <opisowa_nazwa>`.
- **Nie wymyślaj współrzędnych, wysokości ani nazw z pamięci.** Wszystkie dane geograficzne mają
  pochodzić z pliku shp. Lista popularnych miejsc w etapie 3 zawiera tylko nazwy, typy i rodziców;
  współrzędne dołączasz przez dopasowanie do shp. Jeśli nazwy z listy nie da się dopasować,
  wypisz ją w raporcie zamiast zgadywać.
- Jeśli struktura pliku shp różni się od opisanej niżej, zatrzymaj się i pokaż mi nagłówki
  kolumn, zanim napiszesz mapowanie.

## Decyzje produktowe (kontekst)

1. Jedno pole wyszukiwania dla wszystkich typów miejsc. Typ pokazywany jako etykieta przy podpowiedzi,
   nie jako osobne pola.
2. Hierarchia: szczyt → pasmo → region. Wyszukiwanie po pasmie ma znaleźć wycieczki na szczyty
   w tym paśmie; wyszukiwanie po szczycie dokłada jego pasmo.
3. Dwie warstwy danych: krótka lista popularnych miejsc (ładowana raz do klienta, filtrowana w pamięci)
   i pełna baza z shp (wyszukiwanie po stronie serwera, gdy lista popularnych nie daje wyniku).
4. Wycieczka ma dwa pola miejsca o różnych **rolach**, nie typach: `destination` (cel: pasmo, szczyt)
   i opcjonalnie `basePlace` (baza / dojazd: miejscowość). Oba używają tego samego pickera.
5. Użytkownik zawsze może wpisać własną nazwę, jeśli miejsca nie ma w bazie.

## Dane wejściowe

Pobrałem ręcznie z dane.gov.pl (zbiór „Państwowy Rejestr Nazw Geograficznych") dwa pliki
i umieściłem je w `apps/api/prisma/data/shp/`:

- `obiekty-fizjograficzne.xlsx` — szczyty, pasma, przełęcze, doliny itd.
- `miejscowosci.xlsx` — miejscowości.

Pliki są duże (dziesiątki tysięcy wierszy). Nie commituj ich — dodaj `apps/api/prisma/data/shp/`
do `.gitignore`. Commitujesz tylko skrypt i wygenerowany plik `places.seed.json` (etap 3).

Oczekiwane kolumny (do zweryfikowania na pliku): nazwa główna, rodzaj obiektu (kategoria tekstowa),
współrzędne (szerokość i długość geograficzna w WGS84 lub układzie PL-1992 — sprawdź i przelicz,
jeśli trzeba, biblioteką `proj4`), województwo / powiat / gmina dla miejscowości, ewentualnie
nazwy oboczne. Pierwszy krok etapu 2 to wypisanie unikalnych wartości kolumny „rodzaj obiektu"
z ich liczebnością, żebym mógł wskazać, które kategorie importować.

---

## Etap 1 — model danych

Dodaj do `schema.prisma`:

```prisma
enum PlaceType { PEAK RANGE PASS TOWN REGION }

model Place {
  id         String    @id @default(cuid())
  name       String
  nameNorm   String                       // małe litery, bez diakrytyków
  type       PlaceType
  parent     Place?    @relation("PlaceHierarchy", fields: [parentId], references: [id])
  parentId   String?
  children   Place[]   @relation("PlaceHierarchy")
  lat        Float
  lng        Float
  elevation  Int?
  aliases    String[]  @default([])
  aliasesNorm String[] @default([])
  popularity Int       @default(0)         // 0 = tylko w pełnej bazie, >0 = na liście popularnych
  source     String                        // "shp:<id>" | "manual"
  region     String?                       // np. "pow. tatrzański" — do rozróżniania duplikatów
  createdAt  DateTime  @default(now())

  tripsAsDestination Trip[] @relation("TripDestination")
  tripsAsBase        Trip[] @relation("TripBase")
  requests           RideRequest[]

  @@index([nameNorm])
  @@index([type, popularity])
}
```

Zmiany w istniejących modelach:

- `Trip`: dodaj `destinationPlace Place? @relation("TripDestination", ...)`, `destinationPlaceId String?`,
  `basePlace Place? @relation("TripBase", ...)`, `basePlaceId String?`. Pole tekstowe `destination`
  **zostaje** jako fallback dla własnych nazw i jako zdenormalizowana etykieta do wyświetlania.
- `RideRequest`: analogicznie `destinationPlaceId String?`, tekstowe `destination` zostaje.

Migracja `add_places`. Osobną migracją (`add_place_search_extensions`) włącz rozszerzenia Postgresa
i indeks trigramowy — Prisma tego nie generuje, więc napisz SQL ręcznie w pliku migracji:

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX place_namenorm_trgm_idx ON "Place" USING gin ("nameNorm" gin_trgm_ops);
```

Sprawdź, że lokalny Postgres w `docker-compose.yml` (obraz `postgres:16`) ma te rozszerzenia —
standardowy obraz je zawiera.

## Etap 2 — skrypt importu z shp

Utwórz `apps/api/prisma/scripts/import-places.ts`, uruchamiany przez `npx ts-node`.
Biblioteka do XLSX: `xlsx` (SheetJS). Skrypt ma być idempotentny — klucz to `source = "shp:<id>"`,
istniejące rekordy aktualizuje (`upsert`), nie dubluje.

Kroki:

1. `--inspect`: wczytaj oba pliki, wypisz nagłówki i unikalne wartości kolumny rodzaju obiektu
   z liczebnością. Zatrzymaj się i pokaż mi wynik.
2. Po mojej decyzji o kategoriach — mapowanie rodzaju obiektu shp na `PlaceType`. Wstępnie:
   szczyt / góra / wierzchołek → `PEAK`; pasmo górskie / grupa górska / masyw → `RANGE`;
   przełęcz → `PASS`; miejscowości: miasto / wieś → `TOWN`. Doliny, kotliny, wzgórza poza
   obszarami górskimi — pomiń.
3. Miejscowości: importuj tylko te, których współrzędne leżą w prostokącie obejmującym polskie
   góry — orientacyjnie szerokość 49.0–51.0 N i długość 15.0–23.0 E, plus wyjątki z listy popularnych.
   Nie potrzebujemy każdej wsi z Mazowsza. W polu `region` zapisz powiat.
4. Normalizacja nazwy do `nameNorm`: `name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()`.
   Uwaga: polskie „ł" nie rozkłada się przez NFD — dodaj jawne zamiany `ł→l`, `Ł→L`. Umieść tę funkcję
   w `packages/shared/src/normalize.ts`, bo frontend użyje tej samej.
5. Wysokość dla szczytów, jeśli plik ją zawiera.
6. `--report`: na końcu wypisz liczbę zaimportowanych rekordów per typ.

Hierarchii (`parentId`) w tym etapie **nie ustawiaj** automatycznie — shp rzadko podaje pasmo dla szczytu.
Rodziców przypiszesz w etapie 3 dla listy popularnych, a resztę zostawiasz bez rodzica.

## Etap 3 — lista popularnych miejsc

Utwórz `apps/api/prisma/data/places.seed.json` — ręcznie kuratorowana lista. Format wpisu:

```json
{ "name": "Babia Góra", "type": "PEAK", "parent": "Beskid Żywiecki", "popularity": 100, "aliases": ["Diablak"] }
```

Zawartość, w tej kolejności priorytetów:

1. **Pasma i regiony** (popularity 90): Tatry, Tatry Wysokie, Tatry Zachodnie, Pieniny, Gorce,
   Beskid Śląski, Beskid Żywiecki, Beskid Mały, Beskid Makowski, Beskid Wyspowy, Beskid Sądecki,
   Beskid Niski, Bieszczady, Karkonosze, Góry Izerskie, Góry Stołowe, Góry Sowie, Masyw Śnieżnika,
   Góry Bialskie, Góry Złote, Góry Bardzkie, Góry Opawskie, Góry Świętokrzyskie, Sudety, Beskidy.
   Regiony bez ścisłej granicy (Podhale, Spisz, Orawa, Ziemia Kłodzka) jako `REGION`.
2. **Szczyty Korony Gór Polski** (popularity 100) — 28 szczytów, każdy z rodzicem-pasmem.
3. **Inne znane szczyty** (popularity 70): Giewont, Kasprowy Wierch, Świnica, Kozi Wierch,
   Rysy, Trzy Korony, Sokolica, Pilsko, Wielka Racza, Barania Góra, Lubomir, Luboń Wielki,
   Wielki Szyszak, Wysoka Kopa, Szczeliniec Wielki, Wielka Sowa, Halicz, Połonina Wetlińska,
   Połonina Caryńska, Łysica, Łysa Góra. Uzupełnij tę listę do ~60 pozycji rozsądnymi kandydatami,
   ale zaznacz w raporcie, które dodałeś od siebie.
4. **Miejscowości wypadowe** (popularity 80): Zakopane, Kościelisko, Bukowina Tatrzańska,
   Białka Tatrzańska, Poronin, Szczawnica, Krościenko nad Dunajcem, Rabka-Zdrój, Nowy Targ,
   Zawoja, Korbielów, Ustroń, Wisła, Szczyrk, Brenna, Istebna, Krynica-Zdrój, Piwniczna-Zdrój,
   Muszyna, Ustrzyki Górne, Wetlina, Cisna, Komańcza, Karpacz, Szklarska Poręba, Świeradów-Zdrój,
   Kudowa-Zdrój, Duszniki-Zdrój, Polanica-Zdrój, Karłów, Międzygórze, Stronie Śląskie, Lądek-Zdrój,
   Bielsko-Biała, Nowy Sącz, Jelenia Góra, Kłodzko, Sanok. Rodzic = pasmo lub region, w którym leży.
5. **Przełęcze** (popularity 50): Przełęcz Okraj, Przełęcz Karkonoska, Przełęcz Salmopolska,
   Przełęcz Krowiarki, Przełęcz Wyżna, Przełęcz Knurowska.

Skrypt `apps/api/prisma/scripts/apply-popular-places.ts`:

- Dla każdego wpisu znajdź rekord `Place` po `nameNorm` i `type`. Jeśli jest kilka (np. kilka wsi
  o tej samej nazwie), wybierz ten najbliższy współrzędnym rodzica, a jeśli rodzica nie da się
  ustalić — wypisz konflikt w raporcie i pomiń.
- Ustaw `popularity`, `aliases`, `aliasesNorm` i `parentId` (rodzic dopasowany też po nazwie).
- Jeśli miejsca nie ma w shp (np. region nieformalny typu Podhale), utwórz rekord ze `source: "manual"`
  i współrzędnymi wyliczonymi jako środek ciężkości dzieci — dopiero po przypisaniu dzieci.
  Jeśli dzieci nie ma, wypisz w raporcie i **nie twórz** rekordu bez współrzędnych.
- Raport: dopasowane / utworzone ręcznie / niedopasowane / konflikty.

Kolejność uruchamiania: pasma i regiony najpierw, potem szczyty, przełęcze, miejscowości —
żeby rodzice istnieli, zanim dzieci ich szukają.

## Etap 4 — API

Moduł `apps/api/src/places`:

- `GET /places/popular` — wszystkie rekordy z `popularity > 0`, pola: `id, name, type, parentId,
  parentName, lat, lng, aliases, popularity`. Nagłówek `Cache-Control: public, max-age=86400`.
  Endpoint publiczny (bez JWT) — lista popularnych nie jest wrażliwa i przyda się na stronie
  wycieczki bez logowania.
- `GET /places/search?q=<tekst>&limit=10` — publiczny. Wymaga `q` o długości ≥ 2.
  Zapytanie surowe (`$queryRaw`) z rankingiem:
  1. `nameNorm` zaczyna się od `q` — waga 3
  2. dowolne słowo w `nameNorm` zaczyna się od `q` — waga 2
  3. element `aliasesNorm` zaczyna się od `q` — waga 2
  4. `similarity(nameNorm, q) > 0.3` — waga 1, tie-break po `similarity`
  Wewnątrz wagi sortuj po `popularity DESC`, potem `name ASC`. Zwracaj te same pola co `/popular`.
- `GET /places/:id/descendants` — id wszystkich miejsc podrzędnych (rekurencyjnie, `WITH RECURSIVE`).
  Użyje go filtr wycieczek.
- Rozszerz `GET /trips` o parametr `placeId`: zwraca wycieczki, których `destinationPlaceId`
  lub `basePlaceId` jest równe `placeId`, jednemu z jego potomków **lub** jego rodzicowi.

Walidacja `q`: obetnij do 60 znaków, znormalizuj funkcją z shared przed zapytaniem.

## Etap 5 — komponent PlacePicker

`apps/web/src/features/places/`:

- `placesApi.ts` — wywołania obu endpointów.
- `usePopularPlaces.ts` — hook ładujący `/places/popular` raz na sesję (moduł-level cache, nie
  `localStorage`), zwracający listę i funkcję `filterLocal(q)` z tym samym rankingiem co serwer,
  ale w pamięci.
- `PlacePicker.tsx` — props: `value: PlaceRef | null`, `onChange(value: PlaceRef | null)`,
  `label`, `placeholder`, `allowCustom` (domyślnie `true`). `PlaceRef` (dodaj do shared) to
  `{ placeId: string; name: string } | { placeId: null; name: string }` — drugi wariant dla
  własnych nazw.
  Zachowanie:
  1. Po wpisaniu ≥ 1 znaku pokaż wyniki z listy lokalnej natychmiast.
  2. Po ≥ 2 znakach i 200 ms debounce dopytaj `/places/search`; dołącz wyniki serwera pod lokalnymi,
     bez duplikatów po `id`. Anuluj poprzednie żądanie (`AbortController`).
  3. Każda podpowiedź: nazwa, pod spodem mała etykieta `<typ> · <rodzic lub region>`
     (np. „szczyt · Beskid Żywiecki", „miejscowość · pow. tatrzański"). Etykiety typów po polsku:
     PEAK → szczyt, RANGE → pasmo, PASS → przełęcz, TOWN → miejscowość, REGION → region.
  4. Ostatnia pozycja listy, gdy `allowCustom` i wpisany tekst nie jest identyczny z żadnym wynikiem:
     „Użyj «<tekst>» jako własnej nazwy".
  5. Nawigacja klawiaturą (strzałki, Enter, Escape), `role="combobox"` i `aria-*` zgodne z wzorcem
     WAI-ARIA combobox. Zamknięcie listy po kliknięciu poza.
  6. Wybrana wartość wyświetlana jako chip z przyciskiem X do wyczyszczenia.
  7. Bez zewnętrznych bibliotek do autouzupełniania — komponent ma być przenośny do React Native
     koncepcyjnie, więc logika (filtrowanie, ranking, debounce) w osobnym hooku `usePlaceSearch.ts`,
     a `PlacePicker.tsx` to tylko warstwa DOM.

Podpięcie:

- `CreateTripPage`: zamień pole tekstowe celu na `<PlacePicker label="Cel wycieczki" />`
  i dodaj `<PlacePicker label="Baza / dojazd do" allowCustom />` jako opcjonalne. Przy zapisie
  wysyłaj `destinationPlaceId` + `destination` (nazwa) oraz `basePlaceId` + `baseName`.
- `CreateRideRequestPage`: analogicznie dla celu.
- `TripsListPage`: nad listą `<PlacePicker label="Dokąd?" allowCustom={false} />`; wybór ustawia
  `placeId` w zapytaniu do `/trips`. Wyczyszczenie przywraca pełną listę.
- `TripDetailPage`: cel i baza wyświetlane z etykietą typu; jeśli `destinationPlace` ma rodzica,
  pokaż go („Babia Góra, Beskid Żywiecki").

## Etap 6 — testy i README

- Testy jednostkowe (Vitest) dla `normalize` w shared: „Śnieżka" → „sniezka", „Łysica" → „lysica",
  „Krościenko nad Dunajcem" → „kroscienko nad dunajcem".
- Testy dla lokalnego rankingu w `usePlaceSearch`: „bab" zwraca Babią Górę przed Babicami;
  „sąd" znajduje Beskid Sądecki; „diab" znajduje Babią Górę przez alias.
- Test integracyjny endpointu `/places/search` na bazie z seedem: „sniez" zwraca Śnieżkę i Śnieżnik,
  „snierz" (literówka) nadal zwraca Śnieżkę.
- README: sekcja „Baza miejsc" — skąd pobrać pliki shp, gdzie je położyć, kolejność uruchamiania
  skryptów, jak dodać miejsce do listy popularnych.

## Weryfikacja końcowa

Pokaż mi:

1. Raport z `import-places.ts` (liczba rekordów per typ) i z `apply-popular-places.ts`
   (dopasowane / ręczne / niedopasowane / konflikty) — chcę zobaczyć listę niedopasowanych.
2. `GET /places/search?q=bab` — Babia Góra pierwsza.
3. `GET /places/search?q=zakop` — Zakopane z etykietą powiatu.
4. Wycieczka z celem „Rysy" pojawia się w `GET /trips?placeId=<id Tatr>`.
5. Wycieczka z własnym celem „Chatka u Zbyszka" (bez `placeId`) da się utworzyć i wyświetla się
   poprawnie na liście i w szczegółach.
