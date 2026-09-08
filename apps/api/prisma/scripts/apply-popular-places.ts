/**
 * Nałożenie kuratorowanej listy popularnych miejsc na bazę zaimportowaną
 * z PRNG.
 *
 *   npx ts-node prisma/scripts/apply-popular-places.ts
 *
 * Lista (`prisma/data/places.seed.json`) trzyma tylko nazwy, typy i rodziców.
 * Współrzędne biorą się z dopasowania do PRNG — nie z niczyjej pamięci.
 *
 * Uruchamiać po `import-places.ts`. Skrypt jest idempotentny i deklaratywny:
 * co nie jest na liście, traci `popularity` i rodzica.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Place, PlaceType, PrismaClient } from '@prisma/client';
import { normalizeName } from '@carpool/shared';

const prisma = new PrismaClient();

const SEED_FILE = path.join(__dirname, '..', 'data', 'places.seed.json');

interface SeedEntry {
  name: string;
  type: PlaceType;
  parent?: string;
  popularity: number;
  aliases?: string[];
  /** Wiersze objaśniające w pliku — pomijane przy wczytywaniu. */
  _komentarz?: string;
}

/**
 * Kolejność ma znaczenie: zanim szczyt zacznie szukać swojego pasma, pasmo
 * musi już być rozstrzygnięte — po jego współrzędnych wybieramy właściwą
 * z kilkunastu „Babich Gór". Miejscowości na końcu, bo ich rodzicem bywa
 * i pasmo, i region.
 */
const TIER: Record<PlaceType, number> = {
  RANGE: 0,
  REGION: 0,
  PEAK: 1,
  PASS: 1,
  TOWN: 2,
};

/** Odległość w kilometrach — dość dokładnie jak na wybór spośród duplikatów. */
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const meanLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dLat = (a.lat - b.lat) * 111.2;
  const dLng = (a.lng - b.lng) * 111.2 * Math.cos(meanLat);
  return Math.hypot(dLat, dLng);
}

interface Report {
  matched: string[];
  created: string[];
  unmatched: string[];
  conflicts: string[];
  retyped: string[];
  cleared: string[];
}

function loadSeed(): SeedEntry[] {
  const raw = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8')) as SeedEntry[];
  const entries = raw.filter((entry): entry is SeedEntry => Boolean(entry.name));

  const seen = new Set<string>();
  for (const entry of entries) {
    const key = `${normalizeName(entry.name)}|${entry.type}`;
    if (seen.has(key)) throw new Error(`Wpis "${entry.name}" (${entry.type}) jest na liście dwa razy`);
    seen.add(key);
  }
  return entries;
}

async function main() {
  const seed = loadSeed();
  const report: Report = { matched: [], created: [], unmatched: [], conflicts: [], retyped: [], cleared: [] };

  /** Rozstrzygnięte wpisy: nazwa z listy → rekord w bazie. */
  const resolved = new Map<string, Place>();

  const ordered = [...seed].sort((a, b) => TIER[a.type] - TIER[b.type]);

  for (const entry of ordered) {
    const names = [entry.name, ...(entry.aliases ?? [])].map(normalizeName);

    // Szukamy i po nazwie głównej, i po obocznych — w obie strony, bo PRNG
    // zapisuje niektóre przełęcze bez słowa „Przełęcz" („Okraj"), a niektóre
    // szczyty pod nazwą oboczną („Luboń" zamiast „Luboń Wielki").
    // Tylko rekordy z PRNG: miejsca dopisane ręcznie ma pod sobą przebieg
    // niżej, inaczej przy drugim uruchomieniu dopasowywałyby się same do
    // siebie i środek ciężkości nigdy nie przeliczyłby się po zmianie dzieci.
    const candidates = await prisma.place.findMany({
      where: {
        source: { startsWith: 'prng:' },
        OR: [{ nameNorm: { in: names } }, { aliasesNorm: { hasSome: names } }],
      },
    });

    if (!candidates.length) {
      report.unmatched.push(`${entry.name} (${entry.type})`);
      continue;
    }

    // Typ z listy jest ważniejszy niż typ z PRNG — Beskid Sądecki czy Góry
    // Świętokrzyskie siedzą w rejestrze pod „regionem naturalnym", a na liście
    // są pasmami. Najpierw jednak próbujemy trafić w typ, żeby nie mylić
    // miejscowości Wysoka ze szczytem Wysoka.
    const sameType = candidates.filter((place) => place.type === entry.type);
    const byType = sameType.length ? sameType : candidates;

    // Trafienie w nazwę główną bije trafienie w oboczną. Bez tego „Wysokie
    // Skałki" z aliasem „Góra Wysoka" przegrywały z zupełnie innym szczytem,
    // który nazywa się „Góra Wysoka" i leży bliżej środka Pienin.
    const byName = byType.filter((place) => place.nameNorm === normalizeName(entry.name));
    const pool = byName.length ? byName : byType;

    let chosen = pool[0];

    if (pool.length > 1) {
      const parent = entry.parent ? resolved.get(entry.parent) : undefined;
      if (!parent) {
        report.conflicts.push(
          `${entry.name} (${entry.type}) — ${pool.length} kandydatów, brak rozstrzygniętego rodzica` +
            `${entry.parent ? ` "${entry.parent}"` : ''}`,
        );
        continue;
      }
      chosen = pool.reduce((best, place) =>
        distanceKm(place, parent) < distanceKm(best, parent) ? place : best,
      );
    }

    if (chosen.type !== entry.type) {
      report.retyped.push(`${entry.name}: ${chosen.type} → ${entry.type}`);
    }

    // Nazwa zostaje ta z PRNG — to ona jest źródłem. Nazwa z listy dokłada się
    // jako oboczna, dzięki czemu „Przełęcz Okraj" znajduje rekord „Okraj".
    const aliases = [...new Set([...chosen.aliases, ...(entry.aliases ?? []), entry.name])].filter(
      (alias) => normalizeName(alias) !== chosen.nameNorm,
    );

    const updated = await prisma.place.update({
      where: { id: chosen.id },
      data: {
        type: entry.type,
        popularity: entry.popularity,
        aliases,
        aliasesNorm: aliases.map(normalizeName),
      },
    });

    resolved.set(entry.name, updated);
    report.matched.push(`${entry.name} → ${chosen.name}${chosen.region ? ` (${chosen.region})` : ''}`);
  }

  // ── Miejsca, których w PRNG nie ma ──────────────────────────────────────
  // Nieformalne całości w rodzaju Sudetów rejestr zna tylko jako nazwy
  // pojedynczych obiektów. Tworzymy je ręcznie, ale dopiero teraz i tylko
  // wtedy, gdy mają dzieci — środek ciężkości dzieci to jedyne współrzędne,
  // jakie możemy podać, nie zmyślając.
  for (const entry of seed) {
    if (resolved.has(entry.name)) continue;

    const children = seed
      .filter((child) => child.parent === entry.name)
      .map((child) => resolved.get(child.name))
      .filter((child): child is Place => Boolean(child));

    if (!children.length) continue;

    const lat = children.reduce((sum, child) => sum + child.lat, 0) / children.length;
    const lng = children.reduce((sum, child) => sum + child.lng, 0) / children.length;
    const aliases = entry.aliases ?? [];

    const existing = await prisma.place.findFirst({
      where: { source: 'manual', nameNorm: normalizeName(entry.name), type: entry.type },
    });

    const data = {
      name: entry.name,
      nameNorm: normalizeName(entry.name),
      type: entry.type,
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
      aliases,
      aliasesNorm: aliases.map(normalizeName),
      popularity: entry.popularity,
      source: 'manual',
    };

    const place = existing
      ? await prisma.place.update({ where: { id: existing.id }, data })
      : await prisma.place.create({ data });

    resolved.set(entry.name, place);
    report.created.push(
      `${entry.name} (${entry.type}) — środek ciężkości ${children.length} dzieci: ` +
        `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`,
    );
  }

  // Na liście niedopasowanych zostają tylko te, których nie udało się także
  // utworzyć ręcznie — reszta właśnie dostała rekord.
  report.unmatched = report.unmatched.filter((line) => !resolved.has(line.split(' (')[0]));

  // ── Hierarchia ─────────────────────────────────────────────────────────
  // Osobnym przebiegiem, kiedy wszyscy rodzice już istnieją — także ci
  // utworzeni ręcznie przed chwilą.
  for (const entry of seed) {
    const place = resolved.get(entry.name);
    if (!place) continue;

    const parent = entry.parent ? resolved.get(entry.parent) : null;
    if (entry.parent && !parent) {
      report.conflicts.push(`${entry.name}: nie znalazłem rodzica "${entry.parent}"`);
    }

    const parentId = parent?.id ?? null;
    if (place.parentId !== parentId) {
      await prisma.place.update({ where: { id: place.id }, data: { parentId } });
    }
  }

  // ── Sprzątanie ─────────────────────────────────────────────────────────
  // Lista jest deklaracją stanu, nie przyrostem: skreślenie wpisu ma zdejmować
  // miejsce z listy popularnych, a nie zostawiać je tam na zawsze.
  const stale = await prisma.place.findMany({
    where: { popularity: { gt: 0 }, id: { notIn: [...resolved.values()].map((place) => place.id) } },
    select: { id: true, name: true, type: true },
  });

  for (const place of stale) {
    await prisma.place.update({
      where: { id: place.id },
      data: { popularity: 0, parentId: null },
    });
    report.cleared.push(`${place.name} (${place.type})`);
  }

  print(report, seed.length);
}

function print(report: Report, total: number) {
  const section = (title: string, lines: string[]) => {
    console.log(`\n${title}: ${lines.length}`);
    lines.forEach((line) => console.log('   ', line));
  };

  console.log(`\n=== Lista popularnych miejsc: ${total} wpisów ===`);
  console.log(`dopasowane do PRNG:  ${report.matched.length}`);
  console.log(`utworzone ręcznie:   ${report.created.length}`);
  console.log(`niedopasowane:       ${report.unmatched.length}`);
  console.log(`konflikty:           ${report.conflicts.length}`);

  section('Utworzone ręcznie (środek ciężkości dzieci)', report.created);
  section('NIEDOPASOWANE — nie ma ich w PRNG', report.unmatched);
  section('KONFLIKTY — kilku kandydatów bez rozstrzygnięcia', report.conflicts);
  section('Typ nadpisany listą', report.retyped);
  section('Zdjęte z listy popularnych (nie ma ich już w seedzie)', report.cleared);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
