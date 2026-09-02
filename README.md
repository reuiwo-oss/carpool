
# Carpool — wspólne przejazdy jednym samochodem

Szkielet aplikacji: kierowca tworzy ofertę przejazdu (model auta, liczba miejsc),
pasażer graficznie wybiera wolne miejsce w samochodzie.

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
```

> Przy edycji `packages/shared` trzymaj watch w osobnym terminalu — bez tego API
> będzie korzystać z nieaktualnej kopii pakietu.

> `npm run dev:web` bez działającego API zwraca w przeglądarce 500 na każde
> żądanie `/api/*` — tak proxy Vite sygnalizuje nieosiągalny backend.
> Szczegóły: [docs/bugfix-2026-09-01-rejestracja-500.md](docs/bugfix-2026-09-01-rejestracja-500.md).

## Role

- **DRIVER** — tworzy i zarządza ofertami przejazdów
- **PASSENGER** — przegląda oferty, rezerwuje miejsce na schemacie auta

Użytkownik wybiera rolę przy rejestracji; docelowo jedno konto będzie mogło mieć obie role.
