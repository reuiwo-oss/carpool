# Handoff: Carpool — mobile UI (Industry design system)

Repo: `reuiwo-oss/carpool`, branch `main`. Target: `apps/web` (React 18 + Vite + TypeScript + react-router). Suggested branch: `design/mobile-prototype`.

## Overview
A mobile-first redesign of the existing web app (`apps/web/src/pages/*`). Same domain model (`packages/shared/src/types.ts`, `seat-layout.ts`), same API (`apps/web/src/features/rides/ridesApi.ts`), new visual layer and a few new flows: role-aware search with an empty state, two-tap seat booking on a technical car diagram, live seat-map preview when publishing, and a "Mine" screen per role.

## About the design files
`prototype/Carpool Mobile.dc.html` is a **design reference built in HTML** — a clickable prototype, not production code. Recreate it in `apps/web` with the existing stack (React function components, react-router, `AuthContext`, `ridesApi`). Do not ship the prototype's runtime (`support.js`, `ios-frame.jsx`, `<x-dc>` templates).

Open the prototype: serve `prototype/` with any static server (`npx serve prototype`) and open `Carpool Mobile.dc.html`. Left rail switches role and jumps between screens.

## Fidelity
**High-fidelity.** Colors, type, spacing and components are final and come from the Industry design system (`prototype/_ds/.../styles.css`, guide in `design-system-readme.md`). Port `styles.css` into `apps/web/src/styles.css` (replace the current file) and use its classes/variables directly. Never hard-code hex values — use `var(--color-*)`.

## Global
- Viewport: designed at 402 px wide; layout is fluid, min 360.
- Background `var(--color-bg)`, text `var(--color-text)`, body font `var(--font-body)` (Barlow) 15px/1.45, headings `var(--font-heading)` (Barlow Condensed) weight 600. Load both fonts (Google Fonts: Barlow 400/500, Barlow Condensed 600) — `styles.css` already links them via `@import`; verify.
- Everything is square-cornered. Framed elements use `.blueprint` + four `<i class="corner tl|tr|bl|br">`.
- Icons: Lucide, stroke 1.5, 18–22 px (`lucide-react` is fine).
- Tap targets ≥ 44 px.
- Avatar placeholder (no photos yet): 40×40 (34 in lists, 44 in ride header) square, `background: var(--color-accent-200)`, `color: var(--color-accent-800)`, heading font 600, initials.
- Toast: absolute, 20px from sides, 96px from bottom, `background: var(--color-neutral-900)`, `color: var(--color-bg)`, padding 12/16, 14px, check icon + text, `box-shadow: var(--shadow-lg)`, fade/slide-in 250ms ease-out, auto-dismiss 2.6 s.

## Navigation
Routes (extend `App.tsx`):
- `/login`, `/register` — no tab bar.
- `/` search, `/community` feed, `/mine`, `/rides/new` (driver only), `/rides/:id` — tab bar on `/`, `/community`, `/mine` only.

Tab bar: fixed bottom, `background: var(--color-bg)`, `border-top: 1px solid var(--color-divider)`, padding `6px 8px` + safe-area bottom. Items flex:1, min-height 50, column, icon 22 + label 11px letter-spacing .02em. Active color `var(--color-accent-700)`, inactive `var(--color-neutral-600)`.
- Passenger: Szukaj (search icon) · Społeczność (users) · Rezerwacje (armchair).
- Driver: Szukaj · Społeczność · **Dodaj** (30×24 solid `var(--color-accent)` square with white plus, label under) · Moje przejazdy.

Back button (detail/create): `.btn.btn-ghost`, chevron-left 18px + label ("Wyniki"/"Wróć"), min-height 44, placed at `padding: 4px 12px 0`.

## Screens

### 1. Logowanie (`/login`)
Padding `28px 24px 40px`, column, flex 1.
- Brand row (margin-bottom 56): car icon 26px `var(--color-accent-700)` + "CARPOOL" heading font 600 22px letter-spacing .02em.
- H1 "Jedziemy razem" 40px, margin 0 0 6px. Sub "Zaloguj się, żeby znaleźć auto albo zabrać kogoś ze sobą." `var(--color-neutral-700)`, margin-bottom 32.
- Fields (`.field` + `label` + `.input`, min-height 46, font-size 16, gap 14): E-mail (placeholder "np. kasia@poczta.pl"), Hasło.
- Submit: `.btn.btn-primary.btn-block.blueprint` + corners, min-height 50, 16px, margin-top 10. Label "Zaloguj się".
- Footer pinned bottom (`margin-top:auto`), centered 14px neutral-700: "Nie masz konta? **Załóż konto**" (link `var(--color-accent-700)`, weight 500).
- Behavior: same as current `LoginPage` (`login(email, password)` → navigate `/`). Show API error text under the form in `var(--color-accent-900)`.

### 2. Rejestracja (`/register`)
Padding `16px 24px 40px`.
- Ghost back "Logowanie". H1 "Załóż konto" 34px, margin 12 0 22.
- Fields gap 12: Imię (placeholder "Jak mamy się do ciebie zwracać?"), E-mail, Hasło (min. 8 znaków).
- Caption 12px neutral-700, margin 26 0 10: "Jak chcesz podróżować? " + neutral-500 "To ustawia cały interfejs."
- Role picker: 2-col grid, gap 16, margin `0 6px`. Each option is a `<button class="blueprint">` with corners, padding `16px 14px`, min-height 150, column gap 12, text-align left: Lucide icon 28px (armchair / car), title heading 22px/1.1 ("Jestem pasażerem" / "Jestem kierowcą"), body 13px opacity .8 ("Dołączam do przejazdów i wybieram miejsce w aucie." / "Oferuję miejsca w swoim aucie i widzę, kto jedzie.").
  - Unselected: transparent bg, `border-color: var(--color-divider)`, text color.
  - Selected: `background: var(--color-accent)`, `color: var(--color-bg)`, border accent. Default selection: PASSENGER (radio semantics — use `role="radiogroup"`).
- Submit primary blueprint, margin-top 28. Label changes with role: "Załóż konto pasażera" / "Załóż konto kierowcy".
- Behavior: `register({name,email,password,role})` → `/`.

### 3. Wyszukiwanie (`/`)
Header `padding: 10px 20px 0`, space-between: H1 "Szukaj przejazdu" 30px + 40×40 avatar button (initials; tapping it logs out for now — replace with profile/menu later).
Form `padding: 14px 20px 0`, gap 8:
- Row grid `1fr 44px 1fr`, gap 6, align end: field "Skąd", swap `.btn.btn-secondary` 44×44 with arrow-left-right icon, field "Dokąd". Inputs min-height 44, 16px, placeholder "Miasto".
- Day chips row, gap 6, each `.btn` flex 1 min-height 40: "Wszystkie", then the next three days as `pt., 11 wrz` etc. Active = `.btn-primary`, inactive `.btn-secondary`. Compute the three days from today.
Results (scroll area, `padding: 18px 0 90px`):
- Count row: `padding 0 20px 6px`, 11px uppercase letter-spacing .1em neutral-600, space-between: "N przejazdów" (Polish plural: 1 przejazd / 2–4 przejazdy / 5+ przejazdów) · "odjazd · wolne".
- Row = `<button>` full width, grid `58px 1fr auto`, gap 12, padding `14px 20px`, `border-top: 1px solid var(--color-divider)`, hover `background: var(--color-accent-100)`; final `border-top` line after the list.
  - Col 1: time heading 26px/1 ("08:30"), under it 11px neutral-600 day short ("sob., 12 wrz").
  - Col 2: "Kraków → Zakopane" heading 19px/1.1 ellipsis; under 13px neutral-700 "Škoda Octavia · Marta".
  - Col 3: `.tag` heading font 600 13px padding 4/8 — `.tag-accent` "N wolne", `.tag-neutral` "pełne" when 0; then 40×40 avatar.
- Filter client-side: `from`/`to` prefix match, case-insensitive; day filter by departure date.

### 3b. Stan pusty (no results)
`padding 22px 24px`, gap 18:
- Blueprint card (corners), padding `26px 20px`, centered column gap 10, margin 6: mini car diagram (see Seat map, `mini`, all seats free, 92px wide), title heading 24px, body 14px neutral-700 max-width 28ch.
  - Passenger: "Nikt jeszcze nie jedzie" / "Na {from} → {to} nie ma jeszcze auta. Zostaw nam znać — powiemy, gdy ktoś opublikuje przejazd." Primary blueprint CTA with bell icon: "Daj mi znać, gdy ktoś pojedzie" → POST a route alert (new endpoint, optional) and toast "Powiadomimy cię o przejazdach: {from} → {to}."
  - Driver: "Wolna trasa" / "Na {from} → {to} nikt nie oferuje miejsc. Ty możesz być pierwszy." Primary CTA with plus: "Opublikuj przejazd na tej trasie" → `/rides/new` prefilled with from/to.
  - If no query typed, substitute "tej trasie" for the route.
- Ghost block button min-height 44: "Pokaż wszystkie przejazdy" → clears query.
- Zero rides in system at all (current `RidesListPage` empty copy): use the same card with passenger/driver variants.

### 4. Społeczność (`/community`)
Header H1 "Społeczność" 30px + sub 14px neutral-700 "Zdjęcia z odbytych przejazdów." Body vertically centered (`padding 24px 30px 110px`): blueprint card padding `30px 22px`, camera icon 34px accent, title 24px "Jeszcze cicho", body 14px "Pierwsze zdjęcie dodasz po odbytym przejeździe. Do tego czasu — znajdź auto.", `.btn-secondary` "Szukaj przejazdu". Feed itself is out of scope for this handoff — empty state only.

### 5. Szczegóły przejazdu (`/rides/:id`)
Top row: ghost back "Wyniki" + `.tag.tag-neutral` full day ("sob., 12 września"), margin-right 8.
Body scroll `padding 6px 20px 40px`:
- Route: two H1 34px/1 ("Kraków", "Zakopane") with a 24px arrow-right icon in `var(--color-accent)` between, baseline-aligned, wrap allowed.
- Time row margin-top 6: heading 30px "08:30" + 14px neutral-700 "odjazd".
- Driver row: margin `18px 0 6px`, padding `12px 0`, top+bottom 1px divider: 44 avatar, name (weight 500) over car (13px neutral-700), right `.tag` "N wolne z M" (accent, or neutral when 0).
- Section head margin `16px 0 4px`: H2 20px "Wybierz miejsce" (passenger) / "Kto gdzie siedzi" (own ride, driver) + 12px neutral-600 car model on the right.
- Legend (below the map) has five items: wolne · zajęte · moje · kierowca · bagażnik — wkrótce.
- Seat map (see below), `padding 4px 6px 0`, max-width 330 centered.
- Legend: centered row, gap 16, 11px neutral-700, 12×12 swatches: outlined accent "wolne"; hatched neutral-400 "zajęte"; filled accent "moje"; filled neutral-900 "kierowca".
- Under the map, exactly one of:
  - Hint (passenger, nothing selected, seats free): centered 14px neutral-700 "Dotknij wolny fotel, żeby go wybrać."
  - Confirm bar (passenger, seat selected): blueprint card `border-color: var(--color-accent)`, padding `14px 16px`, margin `0 6px`, row: seat label heading 19px + 13px neutral-700 "Dotknij fotel jeszcze raz, żeby potwierdzić." + ghost "Anuluj".
  - Booked (user has a seat here): row gap 12, padding 6: check icon 22 accent, heading 19px "Jedziesz — tył prawe" + "Do zobaczenia w aucie.", `.btn-secondary` "Anuluj" (DELETE booking).
  - Roster (driver, ≥1 passenger): kicker 11px uppercase "Kto jedzie", rows padding 9/0 top divider: 34 avatar, name weight 500, seat label 13px neutral-700 right.

### 6. Publikacja (`/rides/new`, driver only)
Ghost back "Wróć". Body `padding 4px 20px 40px`: H1 "Nowy przejazd" 32px margin-bottom 18.
- Fields gap 12: grid 2-col gap 10 "Skąd"/"Dokąd" (placeholders Kraków/Zakopane); "Odjazd" `datetime-local`; "Model auta" (placeholder "np. Škoda Octavia"); "Typ auta" — 3 equal `.btn` cells (min-height 46, two-line: name + 11px description), active `.btn-primary`. Ships with Kombi 5-osobowe only selected/enabled; SUV and Pickup can be hidden or disabled until their phase. Seat count derives from the interior (no stepper).
- Section head margin `22px 0 2px`: H2 20px "Tak zobaczą to pasażerowie" + 12px neutral-600 "{n} + kierowca".
- Live seat map for the chosen interior, all FREE, no backdrop, `padding 4px 40px 0`.
- Primary blueprint block button margin-top 20 "Opublikuj przejazd" → `createRide` → navigate to `/rides/:id`, toast "Przejazd opublikowany."

### 7. Moje (`/mine`)
Header H1 30px "Moje rezerwacje" (passenger) / "Moje przejazdy" (driver) + avatar. Body `padding 14px 20px 100px`, column gap 16. Cards are `.blueprint` + corners, padding `14px 16px`, margin 6, column gap 10.
- Header row space-between: route heading 21px/1.1 + time heading 21px. Meta 13px neutral-700: passenger "day · car · driver", driver "day · car".
- Row gap 12: mini seat map 92px wide + text block.
  - Passenger: kicker "Twoje miejsce" + label weight 500. Actions right-aligned: ghost "Anuluj rezerwację", secondary "Szczegóły".
  - Driver (whole card is a button → detail): kicker "Obsada", heading 22px "2 z 4", 13px neutral-700 names joined by ", " or "Jeszcze nikt — podziel się linkiem".
- Passenger empty state: blueprint card centered, heading 24px "Żadnych planów?", 14px "Znajdź przejazd i wybierz fotel.", secondary "Szukaj przejazdu".
- Needs a `GET /me/bookings` (or filter rides by `bookings[].passengerId === me.id`) and `GET /me/rides` (rides where `driverId === me.id`).

## Seat map component (replace `SeatMap.tsx`)
**Reference implementation: `prototype/seat-map.js`** — plain JS, `render(React, seats, opts)` returns the full SVG. Port it 1:1 to a React component (`SeatMap.tsx`); the geometry, colors and glyphs there are final. Options review with all variants: `prototype/Carpool - schemat auta.dc.html`.

Decisions: interior **Kombi 5-osobowe** (`sedan`: driver + front-right + rear-left/middle/right, large trunk) is the default and the only one shipped now; backdrop **Mapa i szlak** (`map`). SUV / pickup interiors and the other backdrops exist in `seat-map.js` (`INTERIORS`, `BACKDROPS`) for later phases — keep the data model open (`ride.interior`, string).

Geometry (viewBox units): cell 100 wide, row 112 tall, pad 26 (+26 margin when a backdrop is drawn), hood 60. Rows are centred (a 2-seat row sits at ±50 from centre). Body: rounded-top/bottom outline, `stroke var(--color-accent-700)` 1.5, **fill `var(--color-bg)`** so the backdrop is only ever outside the car. Dashed windshield and rear-window arcs, four 10×44 wheel rects (neutral-500), "+" registration crosses at the four SVG corners (neutral-500), "PRZÓD" 9.5px letter-spacing 2 neutral-600. Mini variant (92px, used on cards): no labels, no backdrop, no trunk contents.

Seat = top-down chair: headrest 32×13 rx 6.5; backrest 62×26 with 8px top corners; cushion 60×40 with 11px bottom corners; two bolster lines at ±20 (stroke, 30% opacity). Stroke 1.5. Status below the seat, 11px:
- FREE: fill bg, stroke accent, "+" glyph accent-700, label = seat name.
- SELECTED: fill accent-200, stroke 2, "POTWIERDŹ" 12px heading 600 accent-700, dashed rounded ring 84×98 rx 12 pulsing (stroke-opacity 1→.25, 1.2s).
- TAKEN: paper under-rect then 45° hatch (neutral-400, 5px pitch), stroke neutral-400, label "Zajęte" neutral-600; on the driver's own ride a 30×20 white box with passenger initials and the name as label.
- MINE: fill+stroke accent, white check, label "Twoje".
- DRIVER: fill+stroke neutral-900, white steering-wheel glyph, label "Kierowca" (name on own ride).
Only FREE seats are interactive (`role="button"`), passenger role only; hit area is the whole 96×100 cell.

Trunk ("Bagażnik" — placeholder for a later phase): after the last row, a 1px neutral-300 separator, then a dashed (4 3) neutral-400 rectangle inset 12px, containing a backpack outline glyph (neutral-500) and "BAGAŻNIK" 9.5px letter-spacing 2 neutral-600. Render it read-only now; it will later hold luggage slots. Add a legend item "bagażnik — wkrótce" (12×12 dashed swatch).

Backdrop `map` (outside the car only, all tints from the light accent steps so seats keep contrast): full-bleed `accent-100` at 50%; 32px grid neutral-300 at 55%; three forest blobs (accent-200 at 55% + −45° hairline hatch accent-300 + accent-300 outline) with small two-tier conifer glyphs (accent-700 0.9px, accent-100 fill); a lake in the top-right (accent-200 80%); two contour strokes accent-300; the trail — dashed 4/4 neutral-600 1.4px from a start circle bottom-left, up the left side, across the top, to a summit triangle (accent-100 fill, neutral-600 stroke) on the right. Clip to the SVG box (`overflow:hidden`).

## Interactions & state
- **Two-tap booking:** tap FREE seat → `selectedSeatId`; tapping the same seat again → `bookSeat(rideId, seatId)` → toast "Miejsce zarezerwowane: {label}."; tapping another FREE seat moves selection; "Anuluj" clears. One booking per user per ride — if the user already has a seat, taps toast "Masz już miejsce w tym aucie." Optimistic update, revert on API error with the error text in a toast.
- **Cancel booking:** DELETE (new endpoint if missing) → toast "Rezerwacja anulowana."
- Role is `user.role` from `AuthContext`; it changes tab bar, empty-state CTA, detail-page section and `/mine`.
- After publish, the driver lands on the ride detail with back → `/mine`.
- Search state (from/to/day) should persist in URL query params.
- Hover: rows `--color-accent-100`; buttons per `styles.css`. Focus: `:focus-visible` 2px accent ring (already in `styles.css`).

## Design tokens
All in `prototype/_ds/.../styles.css`. Used here: `--color-bg`, `--color-text`, `--color-divider`, `--color-accent`, `--color-accent-100/200/700/800/900`, `--color-neutral-400/500/600/700/800/900`, `--font-heading`, `--font-body`, `--shadow-lg`. Type sizes used: 40/34/32/30/26/24/22/21/20/19/17/16/15/14/13/12/11 px. Radius: 0 everywhere (tokens' 4px radius is not applied to buttons/cards in this design — `.blueprint` is square).

## Assets
- Icons: Lucide (car, armchair, search, users, plus, minus, bell, camera, check, chevron-left, arrow-right, arrow-left-right).
- No photos yet. When available, wrap in `.duotone` (design-system rule), square, hairline frame.

## Files
- `prototype/Carpool Mobile.dc.html` — the clickable prototype (screens + flow logic).
- `prototype/seat-map.js` — the seat-map renderer (seats, interiors, trunk, backdrops). Port this.
- `prototype/Carpool - schemat auta.dc.html` — options review: seat states, 3 interiors, 3 backdrops; chosen: 1a Kombi + 1f Mapa i szlak.
- `prototype/_ds/industry-*/styles.css` — the design system stylesheet to port.
- `design-system-readme.md` — design system guide.
- `prototype/ios-frame.jsx`, `prototype/support.js`, `prototype/_ds/.../_ds_bundle.js` — prototype runtime only, do not port.

## Changelog
- v2: realistic seats, trunk placeholder, interior variants (Kombi default), map backdrop; car-type picker replaces seat stepper.

## Screenshots
`screenshots/` — full prototype canvas (left rail = prototype controls, not part of the app):
- `01-login.png`
- `02-register.png`
- `03-search-passenger.png`
- `04-search-empty-passenger.png`
- `05-detail-passenger.png`
- `06-detail-seat-selected.png`
- `07-mine-passenger.png`
- `08-create-driver.png`
- `09-mine-driver.png`
- `10-detail-driver-own-ride.png`
- `11-community-empty.png`
- `12-seat-map-options.png` — seat states, interiors, backdrops (chosen 1a + 1f)
- `13-v2-detail-passenger.png`
- `14-v2-detail-seat-selected.png`
- `15-v2-create-driver.png`
- `16-v2-mine-driver.png`
