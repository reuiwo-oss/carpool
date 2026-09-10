# Logowanie przez Facebooka

## Cel

Konto w carpool można założyć i otworzyć bez hasła, przez konto na Facebooku. Sposób logowania nie zmienia tego, kim jest użytkownik w systemie: wycieczki, auta, rezerwacje i wiadomości wiszą na `User.id`, a token sesji wygląda tak samo niezależnie od tego, czy wydano go po haśle, czy po Facebooku. Ten dokument opisuje model tożsamości, przepływ w przeglądarce i w powłoce mobilnej, łączenie kont, usuwanie konta oraz warunki, które stawia Meta.

## Model tożsamości

Konto (`User`) ma e-mail unikalny w systemie i **opcjonalne** hasło. Konto bez hasła to konto, do którego jedyną drogą jest tożsamość zewnętrzna.

Tożsamość zewnętrzna to osobny wiersz `Tozsamosc`, jeden na parę dostawca i identyfikator u dostawcy:

| Pole | Znaczenie |
|---|---|
| `userId` | konto, do którego tożsamość należy |
| `dostawca` | `FACEBOOK`; kolejni dostawcy dochodzą jako nowe wartości |
| `idZewnetrzne` | identyfikator użytkownika u dostawcy (dla Mety `id` z `/me`) |
| `emailUDostawcy` | e-mail podany przez dostawcę, może być pusty |
| `createdAt` | moment połączenia |

Para (`dostawca`, `idZewnetrzne`) jest unikalna: jeden profil na Facebooku łączy się z dokładnie jednym kontem. Jedno konto może mieć wiele tożsamości, po jednej na dostawcę.

## Przepływ w przeglądarce

1. Przycisk na ekranie logowania prowadzi na `GET /api/auth/facebook`. Serwer zapisuje losowy `state` w krótkotrwałym ciasteczku i przekierowuje na stronę autoryzacji Mety z uprawnieniami `public_profile` i `email`.
2. Meta wraca na `GET /api/auth/facebook/callback?code=...&state=...`. Serwer odrzuca żądanie, gdy `state` nie zgadza się z ciasteczkiem, wymienia `code` na token dostępu i pobiera `id`, `name`, `email`, `picture` z `/me`.
3. Serwer odnajduje albo zakłada konto (patrz "Łączenie kont"), zapisuje `avatarUrl` z `picture`, jeśli konto nie ma własnego, i wydaje token sesji (`accessToken` z `sub` i `email`, jak po haśle).
4. Serwer przekierowuje na adres aplikacji webowej z tokenem w fragmencie adresu (`#token=...`), skąd aplikacja zapisuje go tak samo jak po logowaniu hasłem.

## Przepływ w powłoce mobilnej

Meta odmawia logowania z osadzonej przeglądarki (webview), więc w aplikacji mobilnej strony Mety otwierają się w przeglądarce systemowej, a powrót do aplikacji idzie przez deep link.

1. Przycisk otwiera `https://<api>/auth/facebook?klient=powloka` w przeglądarce systemowej. Parametr `klient` przyjmuje wyłącznie wartość `powloka`; brak parametru albo inna wartość oznacza przepływ w przeglądarce.
2. Kroki 2 i 3 przebiegają jak w przeglądarce.
3. Zamiast tokenu serwer wystawia **jednorazowy kod** ważny 60 sekund i przekierowuje na `carpool://zalogowano?kod=<kod>`. Strona pośrednia w przeglądarce systemowej pokazuje tekst "Wracamy do aplikacji" i przycisk otwierający ten sam adres ręcznie.
4. Aplikacja odbiera deep link, woła `POST /api/auth/wymiana-kodu` z kodem i dostaje token sesji. Kod po wymianie albo po upływie ważności jest bezwartościowy: wymiana takim kodem, kodem nieznanym albo żądaniem bez kodu kończy się odpowiedzią 401 z komunikatem, a aplikacja pokazuje błąd logowania i wraca na ekran logowania; nic nie jest zapisywane po cichu.

Token nigdy nie podróżuje w deep linku, bo własny schemat URL może zarejestrować inna aplikacja na tym samym urządzeniu i przechwycić powrót; przechwycony kod jednorazowy nie daje sesji bez wymiany, a wymiana jest możliwa tylko raz.

## Łączenie kont

| Sytuacja po powrocie z Mety | Zachowanie |
|---|---|
| istnieje `Tozsamosc` dla tego `idZewnetrzne` | logowanie na powiązane konto |
| brak tożsamości, Meta podała e-mail, konto z tym e-mailem istnieje | logowanie odmówione; serwer wystawia kod oczekujący, a aplikacja prosi o hasło do istniejącego konta i dopiero po nim dopina tożsamość |
| brak tożsamości, Meta podała e-mail, konta nie ma | powstaje konto bez hasła z imieniem z Mety |
| brak tożsamości, Meta nie podała e-maila | serwer wystawia kod oczekujący, a aplikacja prosi o e-mail; dalej jak wyżej z podanym adresem |

Dopięcie tożsamości do istniejącego konta wymaga dowodu posiadania tego konta, czyli hasła, niezależnie od tego, czy e-mail przyszedł od Mety, czy został wpisany ręcznie. Sama zgodność adresu nie jest dowodem: Graph API nie deklaruje, że zwracany adres został zweryfikowany, a konto założone u dostawcy na cudzy adres dawałoby wtedy wejście do cudzego konta w carpool. Zalogowane konto może dopiąć tożsamość także z ekranu profilu.

## Usunięcie konta

Usunięcie konta jest **anonimizacją**, nie skasowaniem wiersza: `name` staje się "Usunięte konto", `email` wartością techniczną unikalną i niepodobną do adresu, `passwordHash` i `avatarUrl` pustymi, a wszystkie wiersze `Tozsamosc` znikają. Wycieczki, auta, rezerwacje i wiadomości zostają, bo są historią innych uczestników; aktywne rezerwacje i auta w wycieczkach, które się jeszcze nie odbyły, są zwalniane tak jak przy rezygnacji.

`POST /api/auth/facebook/usuniecie-danych` przyjmuje od Mety `signed_request`, weryfikuje podpis sekretem aplikacji, uruchamia anonimizację konta powiązanego z `user_id` z żądania i odpowiada JSON-em z `url` strony statusu i `confirmation_code`. To samo działanie jest dostępne dla zalogowanego użytkownika jako `DELETE /api/users/me`.

## Warunki po stronie Mety

Aplikacja w Meta for Developers z produktem Facebook Login i własnymi `App ID` oraz `App Secret`, przekazanymi przez `FACEBOOK_APP_ID` i `FACEBOOK_APP_SECRET`. Adres powrotu (`/api/auth/facebook/callback`) jest zarejestrowany w aplikacji Mety i dostępny po HTTPS. W trybie Live aplikacja Mety wymaga publicznego adresu polityki prywatności oraz adresu callbacku usuwania danych; uprawnienia `public_profile` i `email` nie wymagają App Review.

## Decyzje projektowe

**Osobna tabela tożsamości zamiast pola `facebookId` na `User`.** Drugi dostawca (Google) jest kwestią jednego dodatkowego wiersza w enumie, a nie migracji kolumny; konto z dwiema tożsamościami to dwa wiersze, nie dwa pola.

**Hasło opcjonalne zamiast losowego hasła dla kont z Facebooka.** Losowe hasło udaje, że konto ma drogę logowania, której użytkownik nie zna, i myli logikę "ustaw hasło" z "zmień hasło".

**Anonimizacja zamiast kasowania.** Relacje uczestnika, auta i wiadomości nie mają kaskady na usunięcie konta z zasady: wiadomość w cudzym wątku jest cudzą historią. Kasowanie zostawiłoby dziury w składach odbytych wycieczek.

**Kod jednorazowy w deep linku zamiast tokenu.** Uzasadnienie w sekcji o powłoce mobilnej.

**Hasło przy łączeniu z istniejącym kontem zamiast automatycznego dopięcia po e-mailu.** Automatyczne dopięcie jest wygodne i większość użytkowników nie zauważyłaby różnicy, ale jego bezpieczeństwo zależy od dostawcy tożsamości, a nie od carpool; wymaganie hasła kosztuje jedno pole raz w życiu konta i zamyka przejęcie konta przez rejestrację u dostawcy na cudzy adres.

## Sugestie interfejsu

Przycisk logowania przez Facebooka podlega wytycznym marki Mety, więc jest pierwszym elementem w obcym języku wizualnym na ekranie; warto rozstrzygnąć, jak ma współistnieć z resztą. Rejestracja przez Facebooka mogłaby pominąć pole hasła i pokazać imię jako wypełnione. Konto bez hasła potrzebuje miejsca, w którym można je ustawić, a każde konto miejsca, w którym można odłączyć tożsamość i usunąć konto.

## Czego nie obejmuje

Treść polityki prywatności, ekran profilu i inni dostawcy tożsamości nie są przedmiotem tej specyfikacji.
