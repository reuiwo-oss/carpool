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
- Seat map (see below), `padding 4px 6px 0`, max-width 330 centered.
- Legend: centered row, gap 16, 11px neutral-700, 12×12 swatches: outlined accent "wolne"; hatched neutral-400 "zajęte"; filled accent "moje"; filled neutral-900 "kierowca".
- Under the map, exactly one of:
  - Hint (passenger, nothing selected, seats free): centered 14px neutral-700 "Dotknij wolny fotel, żeby go wybrać."
  - Confirm bar (passenger, seat selected): blueprint card `border-color: var(--color-accent)`, padding `14px 16px`, margin `0 6px`, row: seat label heading 19px + 13px neutral-700 "Dotknij fotel jeszcze raz, żeby potwierdzić." + ghost "Anuluj".
  - Booked (user has a seat here): row gap 12, padding 6: check icon 22 accent, heading 19px "Jedziesz — tył prawe" + "Do zobaczenia w aucie.", `.btn-secondary` "Anuluj" (DELETE booking).
  - Roster (driver, ≥1 passenger): kicker 11px uppercase "Kto jedzie", rows padding 9/0 top divider: 34 avatar, name weight 500, seat label 13px neutral-700 right.

### 6. Publikacja (`/rides/new`, driver only)
Ghost back "Wróć". Body `padding 4px 20px 40px`: H1 "Nowy przejazd" 32px margin-bottom 18.
- Fields gap 12: grid 2-col gap 10 "Skąd"/"Dokąd" (placeholders Kraków/Zakopane); "Odjazd" `datetime-local`; "Model auta" (placeholder "np. Škoda Octavia"); "Miejsca dla pasażerów" stepper: grid `46px 1fr 46px` gap 10 — `.btn-secondary` 46×46 minus, heading 30px count, plus. Range 1–7.
- Section head margin `22px 0 2px`: H2 20px "Tak zobaczą to pasażerowie" + 12px neutral-600 "{n} + kierowca".
- Live seat map of `generateSeats(n)` with all FREE, `padding 4px 40px 0`.
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
SVG, `viewBox 0 0 W H`, W = 3·100 + 2·26 = 352, H = rows·100 + 52 + 62; `width:100%`, max-width 330 (92 for `mini`). Grid positions from `seat-layout.ts` (`x` 0–2, `y` 0–2; driver at 0,0). Cell 100, top pad 26, hood 62.
- Corner registration crosses: 12px `+` at the four SVG corners, `var(--color-neutral-500)` 1px.
- Body: rounded-top/bottom rectangle path, `stroke var(--color-accent-700)` 1.5, no fill. Windshield and rear window: dashed arcs (`4 4`, 1px). Four wheels: 10×44 rects, stroke neutral-500 1.2, fill bg, straddling the body sides.
- "PRZÓD" label at top center: 10px letter-spacing 2, neutral-600 (hidden in `mini`).
- Seat = headrest rect 72×16 above a seat rect 64×50 (both centred on cell, seat centre `cy = 26+62+y·100+44`), stroke 1.5:
  - FREE: fill bg, stroke `var(--color-accent)`, `+` glyph in accent-700, label below (11px, seat label).
  - SELECTED (first tap): fill `var(--color-accent-200)`, stroke 2, text "POTWIERDŹ" 13px heading 600 accent-700; pulsing dashed ring 88×84 (`5 4`, stroke-opacity 1→.25→1, 1.2 s ease-in-out infinite).
  - TAKEN: fill `url(#hatch)` — 45° hairlines 5px apart neutral-400 1.2 — stroke neutral-400, label "Zajęte" neutral-600. Driver's own ride view (`showNames`): white 32×22 box with passenger initials, label = passenger name.
  - MINE: fill + stroke `var(--color-accent)`, white check, label "Twoje".
  - DRIVER: fill + stroke `var(--color-neutral-900)`, white steering-wheel glyph, label "Kierowca" (or driver name for own ride).
- Only FREE seats are clickable (`role="button"`, `aria-label="{label}: free"`), passenger role only; full cell is the hit area.

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
- `prototype/Carpool Mobile.dc.html` — the clickable prototype (screens + all logic incl. seat map SVG in `seatMap()`).
- `prototype/_ds/industry-*/styles.css` — the design system stylesheet to port.
- `design-system-readme.md` — design system guide.
- `prototype/ios-frame.jsx`, `prototype/support.js`, `prototype/_ds/.../_ds_bundle.js` — prototype runtime only, do not port.

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
