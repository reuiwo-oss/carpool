/**
 * Import bazy miejsc z Państwowego Rejestru Nazw Geograficznych.
 *
 *   npx ts-node prisma/scripts/import-places.ts --inspect   (co jest w plikach)
 *   npx ts-node prisma/scripts/import-places.ts             (import + raport)
 *
 * Skrypt jest idempotentny: kluczem jest `source = "prng:<idPRNG>"`, więc
 * kolejne uruchomienie aktualizuje te same rekordy zamiast je dublować.
 *
 * Nie dotyka tego, co należy do kuratorowanej listy popularnych miejsc:
 * `popularity` i `parentId` nigdy, a `type` i nazw obocznych — dla rekordów,
 * które na tej liście są. Inaczej import puszczony po `apply-popular-places.ts`
 * cofa jego robotę.
 *
 * Hierarchii tu nie budujemy: PRNG nie mówi, w którym paśmie leży szczyt.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PlaceType, PrismaClient } from '@prisma/client';
import { normalizeName } from '@carpool/shared';
import { countRecords, readColumns, readRecords, type PrngRecord } from './prng-shapefile';

const prisma = new PrismaClient();

/** Katalog na ręcznie pobrane pliki PRNG — nie jest commitowany. */
const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Mapowanie rodzaju obiektu PRNG na nasz typ miejsca.
 *
 * Uwaga na pułapkę w danych: pasma siedzą pod rodzajem `góry`, a nie pod
 * `pasmo górskie` — Karkonosze, Tatry czy Beskid Żywiecki to w PRNG "góry",
 * podczas gdy "pasmo górskie" zbiera głównie pojedyncze grzbiety.
 *
 * `region naturalny` idzie na REGION, choć mieszczą się w nim także Beskid
 * Sądecki czy Góry Świętokrzyskie. Typ dla nich prostuje kuratorowana lista
 * popularnych miejsc — tam, gdzie ktoś to przemyślał, a nie hurtem tutaj.
 *
 * Świadomie pomijamy `wzgórze, wzniesienie` (8,7 tys. nizinnych pagórków,
 * w tym 89 "Babich Gór", które tylko psułyby podpowiedzi) oraz `grań`
 * (fragment szczytu, nie cel wycieczki).
 */
const TYPE_BY_RODZAJ: Record<string, PlaceType> = {
  'góra, szczyt': PlaceType.PEAK,
  połonina: PlaceType.PEAK,
  turnia: PlaceType.PEAK,

  góry: PlaceType.RANGE,
  'pasmo górskie': PlaceType.RANGE,
  masyw: PlaceType.RANGE,

  przełęcz: PlaceType.PASS,

  'region naturalny': PlaceType.REGION,
  'region etnograficzny': PlaceType.REGION,
  'region historyczny': PlaceType.REGION,
  pogórze: PlaceType.REGION,

  // Zbiór miejscowości PRNG jest osobnym plikiem. Gdy trafi do katalogu,
  // te dwa wiersze wystarczą, żeby wszedł tym samym przebiegiem.
  miasto: PlaceType.TOWN,
  wieś: PlaceType.TOWN,
};

/**
 * Miejscowości bierzemy tylko z okolic gór — prostokąt obejmujący Sudety,
 * Świętokrzyskie, Beskidy, Tatry i Bieszczady. Każda wieś z Mazowsza tylko
 * rozmywałaby podpowiedzi.
 */
const MOUNTAIN_BOX = { minLat: 49.0, maxLat: 51.0, minLng: 15.0, maxLng: 23.0 };

/**
 * Jeden obiekt PRNG ma kilka punktów: główny, dodatkowe oraz początkowy
 * i końcowy (dla rzek). Dopiero po zawężeniu do punktu głównego `idPRNG`
 * jest unikalny — bez tego filtru ten sam szczyt wpadłby kilka razy.
 */
const MAIN_POINT = 'punkt główny';

interface PlaceInput {
  source: string;
  name: string;
  nameNorm: string;
  type: PlaceType;
  lat: number;
  lng: number;
  elevation: number | null;
  aliases: string[];
  aliasesNorm: string[];
  region: string | null;
}

/**
 * Sześć miejsc po przecinku to jakieś 11 cm — więcej, niż potrzeba do
 * pokazania szczytu na mapie, i mniej, niż `double precision` gubi w drodze
 * przez Postgresa. Bez tego zaokrąglenia porównanie przy kolejnym imporcie
 * wykazywałoby zmianę w co trzecim rekordzie, bo z bazy wraca siedemnasta
 * cyfra znacząca inna niż zapisana.
 */
const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** Nazwy oboczne PRNG trzyma w jednym polu, rozdzielone średnikami. */
function parseAliases(raw: string): string[] {
  return raw
    .split(';')
    .map((alias) => alias.trim())
    .filter(Boolean);
}

/**
 * PRNG nie ma kolumny z wysokością — czasem stoi ona w opisie, w formie
 * "wysokość 167 m n.p.m.". Bierzemy ją, gdy jest, i nie dopisujemy nic
 * od siebie, gdy jej nie ma.
 */
function parseElevation(informDod: string): number | null {
  const match = informDod.match(/wysokość\s+(\d+(?:[.,]\d+)?)\s*m/i);
  return match ? Math.round(Number(match[1].replace(',', '.'))) : null;
}

/**
 * Etykieta odróżniająca miejsca o tej samej nazwie. Powiat grodzki PRNG
 * zapisuje z wielkiej litery nazwą miasta ("Jelenia Góra"), ziemski z małej
 * ("tatrzański") — stąd dwa przedrostki zamiast jednego "pow.".
 */
function formatRegion(powiat: string): string | null {
  if (!powiat) return null;
  return /^[a-ząćęłńóśźż]/.test(powiat) ? `pow. ${powiat}` : `m. ${powiat}`;
}

function toPlace(record: PrngRecord): PlaceInput | null {
  const name = record.get('nazwaGlown');
  const rodzaj = record.get('rodzaj');
  const type = TYPE_BY_RODZAJ[rodzaj];

  if (!name || !type) return null;
  if (record.get('rodzajRepr') !== MAIN_POINT) return null;

  if (type === PlaceType.TOWN) {
    const { minLat, maxLat, minLng, maxLng } = MOUNTAIN_BOX;
    const inBox =
      record.lat >= minLat && record.lat <= maxLat && record.lng >= minLng && record.lng <= maxLng;
    if (!inBox) return null;
  }

  const aliases = parseAliases(record.get('nazwaObocz'));

  return {
    source: `prng:${record.get('idPRNG')}`,
    name,
    nameNorm: normalizeName(name),
    type,
    lat: round(record.lat),
    lng: round(record.lng),
    elevation: parseElevation(record.get('informDod')),
    aliases,
    aliasesNorm: aliases.map(normalizeName),
    region: formatRegion(record.get('powiat')),
  };
}

/** Wszystkie shapefile'e w katalogu z danymi, niezależnie od podkatalogu. */
function findShapefiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findShapefiles(full);
    return entry.name.toLowerCase().endsWith('.shp') ? [full.slice(0, -4)] : [];
  });
}

/**
 * `--inspect`: co w ogóle jest w plikach. Uruchamiane przed napisaniem
 * mapowania, żeby nikt nie zgadywał nazw kolumn ani kategorii.
 */
function inspect(bases: string[]) {
  for (const base of bases) {
    console.log(`\n=== ${path.relative(DATA_DIR, base)} — ${countRecords(base)} rekordów ===`);
    console.log('kolumny:', readColumns(base).join(', '));

    const counts = new Map<string, { all: number; main: number }>();
    for (const record of readRecords(base)) {
      const key = `${record.get('kategoria')} | ${record.get('rodzaj')}`;
      const entry = counts.get(key) ?? { all: 0, main: 0 };
      entry.all++;
      if (record.get('rodzajRepr') === MAIN_POINT) entry.main++;
      counts.set(key, entry);
    }

    console.log('\nrodzaj obiektu (wszystkie punkty / punkty główne):');
    for (const [key, { all, main }] of [...counts].sort((a, b) => b[1].main - a[1].main)) {
      const mapped = TYPE_BY_RODZAJ[key.split(' | ')[1]];
      const arrow = mapped ? `  → ${mapped}` : '';
      console.log(`${String(all).padStart(7)} /${String(main).padStart(7)}  ${key}${arrow}`);
    }
  }
}

/** Wstawiamy porcjami — jeden `createMany` na 10 tys. rekordów to za dużo parametrów. */
const BATCH = 500;

async function importPlaces(bases: string[]) {
  const wanted = new Map<string, PlaceInput>();
  const duplicates: string[] = [];

  for (const base of bases) {
    for (const record of readRecords(base)) {
      const place = toPlace(record);
      if (!place) continue;
      // Po filtrze punktu głównego `idPRNG` jest unikalny. Gdyby przestał być,
      // lepiej to zobaczyć w raporcie niż po cichu nadpisać rekord.
      if (wanted.has(place.source)) duplicates.push(`${place.source} (${place.name})`);
      wanted.set(place.source, place);
    }
  }

  const existing = await prisma.place.findMany({
    where: { source: { startsWith: 'prng:' } },
    select: {
      id: true,
      source: true,
      name: true,
      type: true,
      lat: true,
      lng: true,
      elevation: true,
      aliases: true,
      region: true,
      popularity: true,
    },
  });
  const bySource = new Map(existing.map((place) => [place.source, place]));

  const fresh: PlaceInput[] = [];
  let updated = 0;

  for (const place of wanted.values()) {
    const current = bySource.get(place.source);
    if (!current) {
      fresh.push(place);
      continue;
    }

    // Rekord z listy popularnych ma kuratora, a kurator bije rejestr: typ
    // („Beskid Sądecki" jest u nas pasmem, choć PRNG zna go jako region
    // naturalny) i nazwy oboczne (to stamtąd „Okraj" wie, że bywa nazywany
    // „Przełęczą Okraj"). Bez tego wyjątku ponowny import po cichu cofa
    // jedno i drugie, a nazwa z listy przestaje cokolwiek znajdować.
    const curated = current.popularity > 0;

    const changed =
      current.name !== place.name ||
      current.lat !== place.lat ||
      current.lng !== place.lng ||
      current.elevation !== place.elevation ||
      current.region !== place.region ||
      (!curated &&
        (current.type !== place.type ||
          current.aliases.join('|') !== place.aliases.join('|')));

    if (!changed) continue;

    const { type, aliases, aliasesNorm, ...fromRegistry } = place;

    // Ani `popularity`, ani `parentId` — te w całości należą do listy
    // popularnych miejsc i ponowny import nie ma prawa ich cofnąć.
    await prisma.place.update({
      where: { id: current.id },
      data: curated ? fromRegistry : place,
    });
    updated++;
  }

  for (let at = 0; at < fresh.length; at += BATCH) {
    await prisma.place.createMany({ data: fresh.slice(at, at + BATCH) });
  }

  return { found: wanted.size, fresh: fresh.length, updated, duplicates };
}

/** `--report`: ile czego wylądowało w bazie. */
async function report(result: Awaited<ReturnType<typeof importPlaces>>) {
  const byType = await prisma.place.groupBy({
    by: ['type'],
    where: { source: { startsWith: 'prng:' } },
    _count: { _all: true },
  });

  console.log('\n=== Raport importu ===');
  console.log(`pasujących obiektów w plikach: ${result.found}`);
  console.log(`nowych rekordów:               ${result.fresh}`);
  console.log(`zaktualizowanych:              ${result.updated}`);

  console.log('\nw bazie (source = prng:*):');
  for (const row of byType.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`${String(row._count._all).padStart(7)}  ${row.type}`);
  }

  const withElevation = await prisma.place.count({
    where: { source: { startsWith: 'prng:' }, elevation: { not: null } },
  });
  console.log(`\nz wysokością: ${withElevation}`);
  console.log('(PRNG nie ma kolumny z wysokością — bierzemy ją tylko stamtąd,');
  console.log(' gdzie stoi w opisie obiektu)');

  if (result.duplicates.length) {
    console.log(`\nUWAGA — powtórzone idPRNG mimo filtru punktu głównego: ${result.duplicates.length}`);
    result.duplicates.slice(0, 20).forEach((entry) => console.log('  ', entry));
  }

  if (byType.every((row) => row.type !== PlaceType.TOWN)) {
    console.log('\nBrak miejscowości (TOWN): w katalogu nie ma zbioru PRNG z miejscowościami.');
    console.log('Po dorzuceniu go do prisma/data/ wystarczy uruchomić ten skrypt ponownie.');
  }
}

async function main() {
  const bases = findShapefiles(DATA_DIR);
  if (!bases.length) {
    console.error(`Nie znalazłem żadnego pliku .shp w ${DATA_DIR}`);
    console.error('Pobierz zbiory PRNG z dane.gov.pl i rozpakuj je do tego katalogu.');
    process.exitCode = 1;
    return;
  }

  console.log(`Pliki: ${bases.map((base) => path.basename(base)).join(', ')}`);

  if (process.argv.includes('--inspect')) {
    inspect(bases);
    return;
  }

  await report(await importPlaces(bases));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
