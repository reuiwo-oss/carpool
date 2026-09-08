/**
 * Czytnik shapefile'i z Państwowego Rejestru Nazw Geograficznych.
 *
 * Świadomie bez biblioteki: pliki PRNG mają po półtora giga, a wszystkie
 * czytniki shapefile'i z npm wczytują .dbf do pamięci w całości. Tutaj format
 * jest wykorzystany tylko w tym zakresie, w jakim go potrzebujemy — rekordy
 * o stałej długości czytane porcjami i punktowa geometria z .shp po offsetach
 * z .shx. Reszty specyfikacji (linie, poligony, wartości NULL) nie ruszamy,
 * bo PRNG ich nie używa.
 */

import * as fs from 'fs';
import proj4 from 'proj4';

/**
 * Układ z pliku .prj: ETRS_1989_Poland_CS92, czyli PL-1992 / EPSG:2180.
 * PRNG podaje też `wspGeograf` w stopniach, ale z dokładnością do sekundy
 * (~30 m) — geometria z .shp jest pełna, więc liczymy ją sami.
 */
const PL1992 =
  '+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 ' +
  '+ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';

const WGS84 = '+proj=longlat +datum=WGS84 +no_defs';

export interface PrngRecord {
  /** Wartość kolumny .dbf, przycięta z dopełnienia spacjami. */
  get(column: string): string;
  lat: number;
  lng: number;
}

interface DbfField {
  name: string;
  offset: number;
  length: number;
}

interface DbfHeader {
  fields: DbfField[];
  recordCount: number;
  headerLength: number;
  recordLength: number;
}

function readDbfHeader(fd: number): DbfHeader {
  const head = Buffer.alloc(32);
  fs.readSync(fd, head, 0, 32, 0);
  const recordCount = head.readUInt32LE(4);
  const headerLength = head.readUInt16LE(8);
  const recordLength = head.readUInt16LE(10);

  const descriptors = Buffer.alloc(headerLength - 32);
  fs.readSync(fd, descriptors, 0, descriptors.length, 32);

  const fields: DbfField[] = [];
  // Pierwszy bajt rekordu to znacznik skasowania, stąd offset od 1.
  let offset = 1;
  for (let at = 0; at + 32 <= descriptors.length; at += 32) {
    if (descriptors[at] === 0x0d) break; // terminator listy kolumn
    const name = descriptors.toString('utf8', at, at + 11).replace(/\0.*$/, '');
    const length = descriptors[at + 16];
    fields.push({ name, offset, length });
    offset += length;
  }

  return { fields, recordCount, headerLength, recordLength };
}

/** Nagłówki kolumn — do trybu `--inspect`, zanim ktokolwiek napisze mapowanie. */
export function readColumns(basePath: string): string[] {
  const fd = fs.openSync(`${basePath}.dbf`, 'r');
  try {
    return readDbfHeader(fd).fields.map((f) => f.name);
  } finally {
    fs.closeSync(fd);
  }
}

export function countRecords(basePath: string): number {
  const fd = fs.openSync(`${basePath}.dbf`, 'r');
  try {
    return readDbfHeader(fd).recordCount;
  } finally {
    fs.closeSync(fd);
  }
}

/** Ile rekordów czytamy jednym `readSync` — kompromis pamięć/liczba syscalli. */
const CHUNK = 2000;

/**
 * Rekordy pliku po kolei, jako generator — plik nigdy nie ląduje w pamięci
 * w całości. Rekordy .dbf i .shp są w tej samej kolejności, więc geometrię
 * bierzemy po indeksie z .shx.
 */
export function* readRecords(basePath: string): Generator<PrngRecord> {
  const dbf = fs.openSync(`${basePath}.dbf`, 'r');
  const shp = fs.openSync(`${basePath}.shp`, 'r');
  // .shx to sama tablica offsetów — kilka MB, wczytujemy w całości.
  const shx = fs.readFileSync(`${basePath}.shx`);

  try {
    const { fields, recordCount, headerLength, recordLength } = readDbfHeader(dbf);
    const byName = new Map(fields.map((f) => [f.name, f]));
    const buffer = Buffer.alloc(recordLength * CHUNK);
    const shape = Buffer.alloc(64);

    for (let first = 0; first < recordCount; first += CHUNK) {
      const count = Math.min(CHUNK, recordCount - first);
      fs.readSync(dbf, buffer, 0, recordLength * count, headerLength + first * recordLength);

      for (let i = 0; i < count; i++) {
        const row = buffer.subarray(i * recordLength, (i + 1) * recordLength);
        const index = first + i;

        // Nagłówek .shx: 100 bajtów, potem po 8 bajtów na rekord (offset, długość)
        // — oba w słowach 16-bitowych i big-endian, tak jak chce specyfikacja.
        const at = shx.readInt32BE(100 + index * 8) * 2;
        fs.readSync(shp, shape, 0, 32, at);
        const shapeType = shape.readInt32LE(8);
        // 1 = punkt. PRNG daje wyłącznie punkty; cokolwiek innego pomijamy,
        // zamiast zgadywać środek geometrii, której nie umiemy przeczytać.
        if (shapeType !== 1) continue;

        const [lng, lat] = proj4(PL1992, WGS84, [shape.readDoubleLE(12), shape.readDoubleLE(20)]);

        yield {
          get(column: string) {
            const field = byName.get(column);
            if (!field) throw new Error(`Kolumna "${column}" nie istnieje w ${basePath}.dbf`);
            return row.toString('utf8', field.offset, field.offset + field.length).trim();
          },
          lat,
          lng,
        };
      }
    }
  } finally {
    fs.closeSync(dbf);
    fs.closeSync(shp);
  }
}
