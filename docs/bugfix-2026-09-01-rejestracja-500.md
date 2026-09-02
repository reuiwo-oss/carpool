# Bugfix: `POST /api/auth/register` zwracał 500

**Data:** 2026-09-01
**Status:** rozwiązane — endpoint zwraca `201` z poprawnym tokenem JWT

## Objaw

Kliknięcie „Załóż konto" w [RegisterPage.tsx](../apps/web/src/pages/RegisterPage.tsx) kończyło się błędem w konsoli przeglądarki:

```
api/auth/register:1  Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

## Diagnoza

**Błąd 500 nie pochodził z API — generował go Vite.** Konfiguracja
[vite.config.ts](../apps/web/vite.config.ts) proxuje `/api` na `http://localhost:3000`.
Gdy backend jest nieosiągalny, proxy Vite odpowiada przeglądarce statusem 500 —
niezależnie od tego, co się faktycznie stało po stronie serwera.

Prawdziwy problem: **API w ogóle się nie uruchamiało.** Proces przewracał się przy
starcie, na dwóch niezależnych błędach jeden za drugim.

### Przyczyna 1 — bcrypt bez binarki natywnej

```
Error: Cannot find module '...\node_modules\bcrypt\lib\binding\napi-v3\bcrypt_lib.node'
  at ...\node_modules\bcrypt\bcrypt.js:6:16
```

Katalog `node_modules/bcrypt/lib/` był pusty. Powód — polityka npm blokująca skrypty
instalacyjne:

```
6 packages have install scripts blocked because they are not covered by allowScripts:
  bcrypt@5.1.1 (install: node-pre-gyp install --fallback-to-build)
  esbuild, prisma, @nestjs/core, @prisma/client, @prisma/engines
```

`bcrypt` potrzebuje tego skryptu, żeby pobrać albo skompilować binarkę natywną, więc
nigdy jej nie dostał. `npm rebuild bcrypt` nie pomaga — jest blokowany z tego samego powodu.

### Przyczyna 2 — `@carpool/shared` wskazywał na surowy TypeScript

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\packages\shared\src\types'
  imported from ...\packages\shared\src\index.ts
```

Pakiet miał `"main": "src/index.ts"`. Node ładował `index.ts`, trafiał na
`export * from './types'` i przewracał się — ESM wymaga jawnego rozszerzenia pliku.

Vite to toleruje, Node nie. Frontend tego nie zauważył, bo importuje z pakietu
wyłącznie typy (`import type`), które znikają przy kompilacji. API importuje
`generateSeatLayout` w czasie wykonania, więc dla backendu był to twardy błąd.

## Rozwiązanie

### 1. `bcrypt` → `bcryptjs`

Zamiast luzować politykę skryptów instalacyjnych na maszynie — czysty JavaScript,
bez kompilacji natywnej, bez skryptu instalacyjnego. Identyczne API, więc zmiana
sprowadza się do importu:

- [apps/api/src/auth/auth.service.ts](../apps/api/src/auth/auth.service.ts) — `from 'bcrypt'` → `from 'bcryptjs'`
- [apps/api/package.json](../apps/api/package.json) — `bcrypt` / `@types/bcrypt` → `bcryptjs` / `@types/bcryptjs`

Istniejące hashe haseł pozostają ważne — obie biblioteki produkują i weryfikują ten
sam format `$2a$` / `$2b$`. Hashowanie jest wolniejsze (~2–3×), co przy tej skali
nie ma znaczenia.

### 2. Pakiet `shared` dostał realny build

- [packages/shared/tsconfig.json](../packages/shared/tsconfig.json) — nowy plik: CommonJS + deklaracje `.d.ts` → `dist/`
- [packages/shared/package.json](../packages/shared/package.json) — `main` / `types` na `dist/`, skrypty `build` i `dev` (watch)
- [package.json](../package.json) — `dev:api` i `dev:web` uruchamiają najpierw `build:shared`

## Jak uruchamiać po zmianie

```bash
npm run dev:api    # z katalogu głównego — zbuduje shared, potem wystartuje Nest
```

Przy pracy nad `packages/shared` warto trzymać watch obok, inaczej API użyje
nieaktualnej kopii:

```bash
npm run build --workspace packages/shared -- --watch
```

## Weryfikacja

```
POST /api/auth/register  →  201
{"accessToken":"eyJhbGciOiJIUzI1NiIs...","user":{"id":"cmtilut...","role":"PASSENGER"}}
```

Użytkownik testowy został zapisany w bazie i następnie usunięty.

## Sprawdzone przy okazji (bez zmian)

- Postgres działa na porcie 5432, migracja `20260831164538_init` jest zaaplikowana.
- `.env` trafia do `process.env`, ale **przypadkiem**: ładuje go `require('@prisma/client')`,
  a to akurat wykonuje się przed odczytem `JWT_SECRET` w
  [auth.module.ts](../apps/api/src/auth/auth.module.ts). Zależy więc od kolejności
  importów — zmiana kolejności w `app.module.ts` po cichu zepsuje podpisywanie tokenów.

## Do rozważenia

- Dodać `@nestjs/config` (`ConfigModule.forRoot()`), żeby ładowanie `.env` nie zależało
  od kolejności importów.
- Dodać `packages/shared/dist/` do `.gitignore` — to artefakt builda.
- Obsłużyć w [client.ts](../apps/web/src/api/client.ts) przypadek nieosiągalnego backendu,
  żeby „proxy nie odpowiada" nie wyglądało jak błąd serwera.
