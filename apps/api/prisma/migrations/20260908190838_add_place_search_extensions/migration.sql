-- Rozszerzenia i indeks trigramowy pod wyszukiwanie miejsc.
-- Prisma nie generuje ani jednego, ani drugiego, więc SQL jest pisany ręcznie.
-- Standardowy obraz postgres:16 zawiera oba rozszerzenia w contrib.

-- unaccent: „Śnieżka" ma dawać się znaleźć przez „sniezka" także po stronie
-- bazy, gdy zapytanie ominie znormalizowane nameNorm.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- pg_trgm: similarity() do tolerowania literówek („snierz" → „Śnieżka").
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Indeks GIN po trigramach — bez niego similarity() nad całą tabelą Place
-- to sekwencyjny skan przy każdym naciśnięciu klawisza.
CREATE INDEX IF NOT EXISTS place_namenorm_trgm_idx
  ON "Place" USING gin ("nameNorm" gin_trgm_ops);
