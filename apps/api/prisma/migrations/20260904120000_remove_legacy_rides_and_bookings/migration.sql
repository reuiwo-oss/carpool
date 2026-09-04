-- Usunięcie starego modelu i przejęcie jego nazw przez model wycieczkowy.
--
-- Migracja jest pisana ręcznie, bo `prisma migrate diff` nie rozpoznaje zmiany
-- nazwy: proponował DROP TABLE na "TripRide", "TripRideLeg" i
-- "TripSeatReservation" — tabelach z danymi — a stary "Ride" przerabiał
-- w nowy przez ALTER COLUMN. Tutaj dane zostają na miejscu, zmienia się
-- wyłącznie nazwa tabeli i jej więzów.
--
-- Jedyne DROP TABLE dotyczą "Booking", starego "Ride" i tabeli pomocniczej
-- "_LegacyRideMigration" — ich zawartość przeniósł skrypt z etapu 4.

-- ── 1. Wątki odpinają się od starego przejazdu ──────────────────────────────
-- `tripId` i `driverId` wypełnił skrypt migracji, więc mogą stać się wymagane.

ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_rideId_fkey";
DROP INDEX "Conversation_rideId_passengerId_key";
ALTER TABLE "Conversation" DROP COLUMN "rideId";

-- Klucze obce trzeba postawić od nowa: dotąd dopuszczały NULL i kasowały
-- powiązanie zamiast wątku.
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_tripId_fkey";
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_driverId_fkey";
ALTER TABLE "Conversation" ALTER COLUMN "tripId" SET NOT NULL;
ALTER TABLE "Conversation" ALTER COLUMN "driverId" SET NOT NULL;

CREATE UNIQUE INDEX "Conversation_tripId_passengerId_driverId_key"
  ON "Conversation"("tripId", "passengerId", "driverId");

-- ── 2. Stary model znika ────────────────────────────────────────────────────

ALTER TABLE "_LegacyRideMigration" DROP CONSTRAINT "_LegacyRideMigration_tripId_fkey";
DROP TABLE "_LegacyRideMigration";
DROP TABLE "Booking";
DROP TABLE "Ride";

ALTER TABLE "User" DROP COLUMN "role";

DROP TYPE "BookingStatus";
DROP TYPE "Role";

-- ── 3. Model wycieczkowy przejmuje nazwy ────────────────────────────────────
-- RENAME, nie DROP/CREATE — wiersze zostają nietknięte. Postgres nie zmienia
-- przy tym nazw więzów ani indeksów, więc każdy trzeba przemianować osobno,
-- inaczej Prisma zgłosi rozjazd schematu.

ALTER TABLE "TripRide" RENAME TO "Ride";
ALTER TABLE "Ride" RENAME CONSTRAINT "TripRide_pkey" TO "Ride_pkey";
ALTER INDEX "TripRide_tripId_driverId_key" RENAME TO "Ride_tripId_driverId_key";
ALTER TABLE "Ride" RENAME CONSTRAINT "TripRide_tripId_fkey" TO "Ride_tripId_fkey";
ALTER TABLE "Ride" RENAME CONSTRAINT "TripRide_driverId_fkey" TO "Ride_driverId_fkey";
ALTER TABLE "Ride" RENAME CONSTRAINT "TripRide_vehicleId_fkey" TO "Ride_vehicleId_fkey";

ALTER TABLE "TripRideLeg" RENAME TO "RideLeg";
ALTER TABLE "RideLeg" RENAME CONSTRAINT "TripRideLeg_pkey" TO "RideLeg_pkey";
ALTER INDEX "TripRideLeg_rideId_direction_key" RENAME TO "RideLeg_rideId_direction_key";
ALTER TABLE "RideLeg" RENAME CONSTRAINT "TripRideLeg_rideId_fkey" TO "RideLeg_rideId_fkey";

ALTER TABLE "TripSeatReservation" RENAME TO "SeatReservation";
ALTER TABLE "SeatReservation" RENAME CONSTRAINT "TripSeatReservation_pkey" TO "SeatReservation_pkey";
ALTER INDEX "TripSeatReservation_rideId_seatId_key" RENAME TO "SeatReservation_rideId_seatId_key";
ALTER INDEX "TripSeatReservation_rideId_userId_key" RENAME TO "SeatReservation_rideId_userId_key";
ALTER TABLE "SeatReservation" RENAME CONSTRAINT "TripSeatReservation_rideId_fkey" TO "SeatReservation_rideId_fkey";
ALTER TABLE "SeatReservation" RENAME CONSTRAINT "TripSeatReservation_userId_fkey" TO "SeatReservation_userId_fkey";

-- ── 4. Wątki wracają na twarde klucze obce ──────────────────────────────────

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
