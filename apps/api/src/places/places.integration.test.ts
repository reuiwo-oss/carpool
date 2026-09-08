import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';

/**
 * Test integracyjny wyszukiwarki miejsc — na prawdziwej bazie, po imporcie
 * z PRNG i nałożeniu listy popularnych:
 *
 *   npm run places:import  --workspace apps/api
 *   npm run places:popular --workspace apps/api
 *   npm test               --workspace apps/api
 *
 * Sensem tego endpointu jest SQL: rankingu z `similarity()` nie da się sprawdzić
 * atrapą bazy, bo to Postgres liczy podobieństwo. Dlatego test dobija się do
 * bazy, a kontroler i serwis składane są ręcznie — kontener DI Nesta potrzebuje
 * `emitDecoratorMetadata`, którego esbuild pod vitestem nie emituje, a to jedyne,
 * czego stąd nie sprawdzamy.
 */

const prisma = new PrismaService();
const places = new PlacesController(new PlacesService(prisma));

const names = async (query: string, limit = 10) =>
  (await places.search(query, String(limit))).map((place) => place.name);

beforeAll(async () => {
  await prisma.$connect();
  const seeded = await prisma.place.count({ where: { popularity: { gt: 0 } } });
  if (seeded === 0) {
    throw new Error(
      'Baza miejsc jest pusta — uruchom places:import i places:popular przed testami',
    );
  }
});

afterAll(() => prisma.$disconnect());

describe('GET /places/search', () => {
  it('„sniez" zwraca Śnieżkę i Śnieżnik', async () => {
    const result = await names('sniez');
    expect(result).toContain('Śnieżka');
    expect(result).toContain('Śnieżnik');
  });

  it('„snierz" — literówka — nadal zwraca Śnieżkę', async () => {
    expect(await names('snierz')).toContain('Śnieżka');
  });

  it('„bab" stawia Babią Górę na pierwszym miejscu', async () => {
    const result = await names('bab');
    expect(result[0]).toBe('Babia Góra');
  });

  it('„zakop" stawia Zakopane pierwsze i podaje powiat', async () => {
    const result = await places.search('zakop', '5');
    expect(result[0].name).toBe('Zakopane');
    expect(result[0].region).toBe('pow. tatrzański');
  });

  it('szuka bez oglądania się na diakrytyki i wielkość liter', async () => {
    expect(await names('ŚNIEŻ')).toEqual(await names('sniez'));
  });

  it('odmawia przy zapytaniu krótszym niż dwa znaki', () => {
    expect(() => places.search('a')).toThrow();
    expect(() => places.search()).toThrow();
  });

  /** Nazwa geograficzna nie zawiera „%", więc dziki znak nie ma prawa nic złapać. */
  it('traktuje % jak zwykły znak, a nie jak dziki', async () => {
    expect(await names('%a')).toEqual([]);
  });

  it('limit ogranicza liczbę wyników', async () => {
    expect((await names('ba', 3)).length).toBe(3);
  });
});

describe('GET /places/popular', () => {
  it('zwraca wyłącznie miejsca z popularity > 0 i dokleja nazwę rodzica', async () => {
    const result = await places.popular();

    expect(result.length).toBeGreaterThan(100);
    expect(result.every((place) => place.popularity > 0)).toBe(true);

    const babia = result.find((place) => place.name === 'Babia Góra');
    expect(babia?.parentName).toBe('Beskid Żywiecki');
    expect(babia?.aliases).toContain('Diablak');
  });
});

/**
 * Import i lista popularnych miejsc piszą po tej samej tabeli. Import jest
 * właścicielem tego, co przychodzi z rejestru, a lista — typu i nazw obocznych
 * dla swoich rekordów. Te asercje pilnują granicy: gdyby import przestał ją
 * uznawać, przy pierwszym uruchomieniu po `places:popular` cicho skasowałby
 * kuratorskie poprawki i nikt by tego nie zauważył aż do zgłoszenia, że
 * „przełęcz Okraj się nie wyszukuje".
 */
describe('to, co dokłada lista popularnych, przeżywa ponowny import', () => {
  it('nazwa z listy szuka rekordu zapisanego w PRNG inaczej', async () => {
    expect(await names('przelecz okraj')).toContain('Okraj');
    expect(await names('lubon wielki')).toContain('Luboń');
  });

  it('typ nadpisany listą zostaje nadpisany', async () => {
    const popular = await places.popular();
    const sadecki = popular.find((place) => place.name === 'Beskid Sądecki');

    // PRNG zna go jako „region naturalny"; u nas jest pasmem, bo tak mówi lista.
    expect(sadecki?.type).toBe('RANGE');
  });
});

describe('GET /places/:id/descendants', () => {
  it('schodzi rekurencyjnie: pod Sudetami są i pasma, i ich szczyty', async () => {
    const sudety = await prisma.place.findFirstOrThrow({
      where: { name: 'Sudety', type: 'RANGE' },
    });

    const below = await places.descendants(sudety.id);
    const names = await prisma.place.findMany({
      where: { id: { in: below } },
      select: { name: true },
    });
    const found = names.map((place) => place.name);

    expect(found).toContain('Karkonosze');
    // Śnieżka jest dzieckiem Karkonoszy, czyli wnuczką Sudetów — gdyby
    // zapytanie nie było rekurencyjne, tu by jej nie było.
    expect(found).toContain('Śnieżka');
    expect(below).not.toContain(sudety.id);
  });
});
