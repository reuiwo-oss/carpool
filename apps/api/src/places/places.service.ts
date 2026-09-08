import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeName, type PlaceSuggestion } from '@carpool/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Zapytanie dłuższe niż nazwa najdłuższej polskiej góry jest pomyłką albo
 * próbą czegoś innego niż szukanie — obcinamy, zamiast puszczać dalej.
 */
const MAX_QUERY = 60;

/** Poniżej tego progu `similarity()` zwraca głównie przypadkowe zbieżności. */
const FUZZY_THRESHOLD = 0.3;

/** Wiersz z zapytania surowego — Prisma nie zna kształtu `$queryRaw`. */
interface SuggestionRow {
  id: string;
  name: string;
  type: PlaceSuggestion['type'];
  parentId: string | null;
  parentName: string | null;
  lat: number;
  lng: number;
  aliases: string[];
  popularity: number;
  region: string | null;
}

@Injectable()
export class PlacesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Krótka lista, którą klient pobiera raz i filtruje u siebie. Dopóki ktoś
   * szuka Zakopanego albo Babiej Góry, żadne żądanie nie leci do serwera.
   */
  async popular(): Promise<PlaceSuggestion[]> {
    const rows = await this.prisma.place.findMany({
      where: { popularity: { gt: 0 } },
      orderBy: [{ popularity: 'desc' }, { name: 'asc' }],
      include: { parent: { select: { name: true } } },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      parentId: row.parentId,
      parentName: row.parent?.name ?? null,
      lat: row.lat,
      lng: row.lng,
      aliases: row.aliases,
      popularity: row.popularity,
      region: row.region,
    }));
  }

  /**
   * Wyszukiwanie w pełnej bazie — dwadzieścia tysięcy nazw, więc filtrowanie
   * po stronie klienta odpada.
   *
   * Ranking w czterech wagach, od najpewniejszego trafienia do najluźniejszego:
   * nazwa zaczyna się od zapytania (3), zaczyna się od niego któreś z dalszych
   * słów albo nazwa oboczna (2), a na końcu podobieństwo trigramowe, które
   * wybacza literówki (1). Wewnątrz wagi decyduje popularność — „bab" ma
   * zwracać Babią Górę, a nie pierwszą alfabetycznie Babią Grapę.
   *
   * Napisane surowym SQL-em, bo `similarity()` z pg_trgm nie ma odpowiednika
   * w API Prismy, a bez niego nie ma tolerancji na literówki.
   */
  async search(rawQuery: string, limit: number): Promise<PlaceSuggestion[]> {
    const query = normalizeName(rawQuery.slice(0, MAX_QUERY));
    if (query.length < 2) return [];

    // `%` i `_` w LIKE są dzikimi kartami. Nazwa geograficzna ich nie zawiera,
    // ale zapytanie przychodzi od użytkownika i nie ma powodu mu ufać.
    const prefix = `${query.replace(/[\\%_]/g, '\\$&')}%`;

    const rows = await this.prisma.$queryRaw<SuggestionRow[]>(Prisma.sql`
      WITH scored AS (
        SELECT
          p.id,
          p.name,
          p.type,
          p."parentId",
          parent.name AS "parentName",
          p.lat,
          p.lng,
          p.aliases,
          p.popularity,
          p.region,
          CASE
            WHEN p."nameNorm" LIKE ${prefix} ESCAPE '\' THEN 3
            WHEN p."nameNorm" LIKE ${`% ${prefix}`} ESCAPE '\'
              OR p."nameNorm" LIKE ${`%-${prefix}`} ESCAPE '\' THEN 2
            WHEN EXISTS (
              SELECT 1 FROM unnest(p."aliasesNorm") AS alias
              WHERE alias LIKE ${prefix} ESCAPE '\'
            ) THEN 2
            ELSE 1
          END AS weight,
          similarity(p."nameNorm", ${query}) AS sim
        FROM "Place" p
        LEFT JOIN "Place" parent ON parent.id = p."parentId"
        WHERE p."nameNorm" LIKE ${prefix} ESCAPE '\'
           OR p."nameNorm" LIKE ${`% ${prefix}`} ESCAPE '\'
           OR p."nameNorm" LIKE ${`%-${prefix}`} ESCAPE '\'
           OR EXISTS (
             SELECT 1 FROM unnest(p."aliasesNorm") AS alias
             WHERE alias LIKE ${prefix} ESCAPE '\'
           )
           OR similarity(p."nameNorm", ${query}) > ${FUZZY_THRESHOLD}
      )
      SELECT id, name, type, "parentId", "parentName", lat, lng, aliases, popularity, region
      FROM scored
      ORDER BY
        weight DESC,
        -- Podobieństwo rozstrzyga tylko wewnątrz najluźniejszej wagi. Wyżej
        -- liczy się popularność: przy trafieniu w początek nazwy nikogo nie
        -- obchodzi, że krótsza nazwa jest „bardziej podobna".
        CASE WHEN weight = 1 THEN sim ELSE 0 END DESC,
        popularity DESC,
        name ASC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({ ...row, popularity: Number(row.popularity) }));
  }

  /**
   * Wszystkie miejsca leżące pod danym — rekurencyjnie, więc szukanie
   * po Sudetach znajdzie i Karkonosze, i Śnieżkę.
   */
  async descendants(id: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      WITH RECURSIVE tree AS (
        SELECT id FROM "Place" WHERE id = ${id}
        UNION ALL
        SELECT child.id FROM "Place" child JOIN tree ON child."parentId" = tree.id
      )
      SELECT id FROM tree WHERE id <> ${id}
    `);

    return rows.map((row) => row.id);
  }

  /**
   * Zbiór miejsc, które przy filtrowaniu wycieczek liczą się jako „to samo, co
   * wybrane": ono samo, wszystko pod nim i jego rodzic.
   *
   * Rodzic wchodzi celowo — kto szuka wycieczek na Śnieżkę, chce zobaczyć też
   * te opisane ogólniej, jako wyjazd w Karkonosze.
   */
  async searchScope(id: string): Promise<string[]> {
    const place = await this.prisma.place.findUnique({
      where: { id },
      select: { id: true, parentId: true },
    });
    if (!place) return [];

    const below = await this.descendants(id);
    return [place.id, ...below, ...(place.parentId ? [place.parentId] : [])];
  }
}
