# Powłoka mobilna: Tauri

## Cel

Aplikacja mobilna carpool na iOS i Androida to ta sama aplikacja webowa (`apps/web`), ten sam zbudowany bundle, uruchomiony w webview natywnej powłoki Tauri 2. Nie istnieje druga warstwa widoku: każdy ekran, schemat auta, wiadomości i logowanie są renderowane przez ten sam kod React co w przeglądarce. Ten dokument opisuje, co działa gdzie, jakie ograniczenia web musi spełniać, żeby działać w webview, jak powłoka jest skonfigurowana, i dlaczego wybrano Tauri zamiast React Native.

Główna korzyść tego układu: **aplikację buduje się raz i działa wszędzie.** Jedna baza kodu, jeden system wizualny, jeden zestaw testów i jedna paczka dla designera obsługują przeglądarkę, iOS i Androida, a z tej samej konfiguracji Tauri buduje także aplikacje na Windows, macOS i Linuksa. Funkcja, która wchodzi do `apps/web`, jest funkcją mobilną w chwili następnego builda powłoki, bez portowania, bez drugiego przeglądu i bez drugiego designu.

## Co działa gdzie

| Warstwa | W przeglądarce | W powłoce mobilnej |
|---|---|---|
| interfejs | karta przeglądarki | webview powłoki (WKWebView na iOS, WebView na Androidzie) |
| kod interfejsu | bundle Vite | ten sam bundle, spakowany do aplikacji |
| API | ten sam serwer po HTTPS | ten sam serwer po HTTPS |
| sesja | `localStorage` przeglądarki | `localStorage` webview, trwały między uruchomieniami |
| strony Mety przy logowaniu | ta sama karta | przeglądarka systemowa, powrót przez deep link |
| powiadomienia, aparat, sklep | brak | pluginy Tauri, poza zakresem tego dokumentu |

## Jedna baza kodu

Każda zmiana w interfejsie ma jedno miejsce i jeden cykl życia:

| Co się zmienia | Gdzie ląduje | Co trzeba zrobić dla mobile |
|---|---|---|
| nowy ekran albo przepływ | `apps/web/src/pages`, router | nic; ekran jest w następnym buildzie powłoki |
| komponent, na przykład schemat auta | jeden plik SVG w `apps/web` | nic; SVG renderuje się w webview identycznie |
| token, kolor, krój | `apps/web/src/styles.css` | nic; jeden arkusz stylów jest jedynym arkuszem |
| model danych, kontrakt API | `packages/shared`, `apps/api` | nic; powłoka nie ma własnego modelu |
| test jednostkowy albo e2e | `packages/shared`, `docs/` | nic; kod pod testem jest ten sam |
| paczka dla designera | zrzuty z działającej aplikacji webowej | nic; to są te same ekrany |

Dwie warstwy widoku rozjeżdżają się od pierwszego dnia: różne szybkości wdrażania, różne błędy, różne interpretacje tego samego projektu. Jedna baza kodu nie może się rozjechać sama ze sobą, więc rozwój produktu jest liniowy w liczbie ekranów, a nie w liczbie ekranów razy liczba platform.

Z jednej bazy kodu wynika jedna reguła o wersjach. Web na serwerze aktualizuje się w chwili wdrożenia, a aplikacja w telefonie dopiero wtedy, gdy użytkownik pobierze nową wersję ze sklepu, więc **ten sam bundle występuje w obiegu w kilku wersjach naraz**. API zachowuje zgodność z bundlami starszymi o co najmniej jedno wydanie sklepowe: pole usuwane z odpowiedzi znika dopiero wydanie po tym, jak przestało być czytane, a nowe pole wymagane w żądaniu ma wartość domyślną po stronie serwera.

## Ograniczenia, które web spełnia w webview

**Brak zależności od przeglądarki desktopowej.** Kod interfejsu nie zakłada obecności rozszerzeń, pasków adresu, otwierania nowych kart ani `window.open`; nawigacja idzie przez router aplikacji.

**Origin powłoki jest obcy dla API.** Webview ładuje bundle z własnego origin (`tauri://localhost` na iOS, `http://tauri.localhost` na Androidzie), więc każde żądanie do API jest żądaniem między domenami. `CORS_ORIGIN` po stronie API wymienia te origin obok domeny webowej, rozdzielone przecinkiem.

**Logowanie zewnętrzne poza webview.** Meta odmawia logowania z osadzonej przeglądarki, więc strony dostawcy tożsamości otwierają się w przeglądarce systemowej, a powrót do aplikacji idzie przez własny schemat URL; w deep linku podróżuje kod jednorazowy, nigdy token sesji. Sam przepływ logowania nie jest przedmiotem tej specyfikacji.

**Jedna gałąź zależna od platformy.** Kod interfejsu rozpoznaje powłokę przez `isTauri()` z `@tauri-apps/api` w jednym miejscu, przy akcjach, które w powłoce muszą wyjść poza webview (otwarcie przeglądarki systemowej, nasłuch deep linku). Poza tym miejscem interfejs nie wie, w czym działa.

## Konfiguracja powłoki

`tauri.conf.json` deklaruje identyfikator aplikacji (`pl.carpool.app` w konwencji odwróconej domeny), adres bundla (`apps/web/dist`) oraz dwa pluginy:

```
plugins.deep-link.mobile   schemat "carpool", bez hosta   <- carpool://... budzi aplikację
plugins.opener             otwieranie adresów https w przeglądarce systemowej
```

Deklaracja schematu bez hosta nie wymaga żadnych plików hostowanych; plugin generuje wpisy w `Info.plist` i `AndroidManifest.xml`. Powrót przez adres `https://` na własnej domenie (Universal Links na iOS, App Links na Androidzie) wymaga dodatkowo plików `.well-known/apple-app-site-association` i `.well-known/assetlinks.json` na domenie webowej oraz odcisku certyfikatu podpisu aplikacji; jest to wariant odporny na przejęcie schematu przez inną aplikację i nie jest przedmiotem tej specyfikacji.

Toolchain budowania: Rust (stabilny), Xcode dla iOS, Android Studio z SDK i NDK dla Androida. Minimalne wersje systemów: iOS 9, Android 8 (API 26).

## Decyzje projektowe

**Tauri zamiast React Native.** Interfejs webowy jest projektowany mobile-first, na szerokość 402 px, i w powłoce działa bez zmian. React Native wymagałby drugiej implementacji każdego ekranu i komponentu: w chwili decyzji sam schemat auta to komponent SVG o ponad czterystu liniach, który musiałby powstać na nowo w `react-native-svg`, a do tego dwanaście stron i wspólny arkusz stylów, który w React Native nie istnieje w tej postaci. Koszt utrzymania dwóch warstw widoku rośnie z każdym ekranem; koszt powłoki jest stały.

**Kryterium: natywne jako wyjątek, nie fundament.** Oba podejścia schodzą do Kotlina i Swifta (plugin Tauri może zawierać kod Rust, bibliotekę Androida i pakiet Swift; React Native ma Turbo Native Modules), więc pytanie nie brzmi, czy funkcje natywne są osiągalne, tylko jak dużą częścią aplikacji są. Powierzchnia natywna carpool jest wąska i zamknięta w gotowych pluginach: otwarcie przeglądarki systemowej, odbiór deep linku, w dalszej kolejności powiadomienia i geolokalizacja przy miejscu zbiórki. Reszta aplikacji, czyli ekrany, stan, trasy, formularze, schemat auta i rozmowa z API, jest interfejsem webowym, i to jest przypadek, w którym powłoka z webview wygrywa.

**Warunek odwrócenia decyzji.** Gdyby produkt zaczął wymagać pracy w tle przez wiele godzin (śledzenie przejazdu przy wygaszonym ekranie, geofencing na zbiórce), ciągłego dostępu do aparatu albo sensorów, albo natywnego SDK w centrum przepływu, natywna warstwa przestałaby być wyjątkiem; wtedy koszt pisania własnych pluginów w Rust, Kotlinie i Swifcie przekroczyłby koszt drugiej warstwy widoku i decyzję trzeba by podjąć na nowo. Żaden z tych warunków nie wynika z modelu wycieczki, auta i rezerwacji.

**Desktop bez osobnej decyzji.** Ta sama konfiguracja Tauri buduje aplikacje na Windows, macOS i Linuksa. Nie jest to cel produktu, ale nie kosztuje nic ponad rejestrację celów budowania; produkt, który miałby go potrzebować, na przykład do obsługi wycieczek z laptopa przez organizatora, dostaje go z tego samego kodu.

**Cena, którą się za to płaci.** Interfejs w webview nie ma natywnych kontrolek ani natywnych gestów systemowych; wrażenie "natywności" zależy od jakości webu. Natywne SDK (na przykład SDK Mety z Limited Login na iOS) są osiągalne wyłącznie przez własny plugin z kodem Rust, Kotlin i Swift, czyli trzema językami na jedną funkcję; dlatego logowanie zewnętrzne idzie przez przeglądarkę systemową, a nie przez SDK. Wsparcie mobilne Tauri jest młodsze niż desktopowe.

**Jedna gałąź platformowa zamiast osobnego wejścia.** Osobny punkt wejścia dla powłoki (`main.mobile.tsx`) kusiłby, żeby z czasem różnicować ekrany; jedno `isTauri()` przy akcjach wychodzących poza webview utrzymuje zasadę, że interfejs jest jeden.

**Sesja w `localStorage` webview, nie w magazynie powłoki.** Magazyn pluginu `store` dawałby szyfrowanie i trwałość niezależną od webview, ale wymagałby drugiej implementacji `client.ts`. `localStorage` webview jest trwały między uruchomieniami i piaskownicowany per aplikacja, co dla tokenu ważnego siedem dni wystarcza.

## Czego nie obejmuje

Powiadomienia push, dostęp do aparatu i geolokalizacji, podpisywanie i publikacja w sklepach oraz przepływ logowania przez dostawcę tożsamości nie są przedmiotem tej specyfikacji.
