/**
 * Przeniesienie starego modelu (Ride + Booking) do wycieczkowego.
 *
 * Uruchomienie z katalogu `apps/api`:
 *     npx ts-node prisma/scripts/migrate-rides-to-trips.ts
 *     npx ts-node prisma/scripts/migrate-rides-to-trips.ts --dry-run
 *
 * Każdy przejazd przenosi się w osobnej transakcji: albo cała wycieczka
 * z autem, uczestnikami i rezerwacjami, albo nic. Ślad w `_LegacyRideMigration`
 * sprawia, że ponowne uruchomienie pomija to, co już przeniesione — skrypt
 * można puścić raz, dwa i dziesięć razy z tym samym skutkiem.
 *
 * Stary przejazd zostaje nietknięty. Kasuje go dopiero etap 6.
 */
import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

interface Tally {
  trips: number;
  vehicles: number;
  participants: number;
  reservations: number;
  legs: number;
  conversations: number;
  skipped: number;
}

const tally: Tally = {
  trips: 0,
  vehicles: 0,
  participants: 0,
  reservations: 0,
  legs: 0,
  conversations: 0,
  skipped: 0,
};

/**
 * Stare przejazdy bywają bez trasy — formularz kiedyś jej nie wymagał.
 * Zamiast pustego tytułu wstawiamy coś, co da się przeczytać na liście.
 */
const routeTitle = (origin: string, destination: string) => {
  const from = origin.trim();
  const to = destination.trim();
  if (from && to) return `${from} → ${to}`;
  return to || from || 'Przejazd bez trasy';
};

/**
 * Garaż zamiast auta wpisanego w przejazd. Marki nie ma skąd wziąć — stary
 * model trzymał wszystko w jednym polu `carModel`. Dopasowujemy po modelu
 * i wnętrzu: ten sam model z innym wnętrzem ma inny układ foteli, więc
 * współdzielenie pojazdu przestawiłoby ludziom miejsca.
 */
async function vehicleFor(
  tx: Prisma.TransactionClient,
  ride: { driverId: string; carModel: string; interior: string; seatLayout: Prisma.JsonValue },
) {
  const existing = await tx.vehicle.findFirst({
    where: { ownerId: ride.driverId, model: ride.carModel, interior: ride.interior },
  });
  if (existing) return { vehicle: existing, created: false };

  const vehicle = await tx.vehicle.create({
    data: {
      ownerId: ride.driverId,
      make: '',
      model: ride.carModel,
      interior: ride.interior,
      seatLayout: ride.seatLayout as Prisma.InputJsonValue,
    },
  });
  return { vehicle, created: true };
}

async function migrateRide(rideId: string, now: Date) {
  return prisma.$transaction(async (tx) => {
    const ride = await tx.ride.findUnique({
      where: { id: rideId },
      include: { bookings: true, conversations: { select: { id: true } } },
    });
    if (!ride) return null;

    const { vehicle, created } = await vehicleFor(tx, ride);

    const trip = await tx.trip.create({
      data: {
        title: routeTitle(ride.origin, ride.destination),
        destination: ride.destination.trim() || 'Nieznany cel',
        startsAt: ride.departureAt,
        // Stary model nie znał powrotu — wycieczka zaczyna się i kończy
        // w tej samej chwili, dopóki ktoś nie dopisze odcinka RETURN.
        endsAt: ride.departureAt,
        createdById: ride.driverId,
        status: ride.departureAt < now ? 'DONE' : 'OPEN',
        createdAt: ride.createdAt,
      },
    });

    await tx.tripParticipant.create({
      data: { tripId: trip.id, userId: ride.driverId, isOrganizer: true, joinedAt: ride.createdAt },
    });

    const tripRide = await tx.tripRide.create({
      data: {
        tripId: trip.id,
        driverId: ride.driverId,
        vehicleId: vehicle.id,
        interior: ride.interior,
        seatLayoutSnapshot: ride.seatLayout as Prisma.InputJsonValue,
        createdAt: ride.createdAt,
        legs: {
          create: {
            direction: 'OUTBOUND',
            origin: ride.origin.trim() || 'Nieznane miejsce zbiórki',
            departureAt: ride.departureAt,
          },
        },
      },
    });

    for (const booking of ride.bookings) {
      await tx.tripParticipant.upsert({
        where: { tripId_userId: { tripId: trip.id, userId: booking.passengerId } },
        create: {
          tripId: trip.id,
          userId: booking.passengerId,
          isOrganizer: false,
          joinedAt: booking.createdAt,
        },
        update: {},
      });
      await tx.tripSeatReservation.create({
        data: {
          rideId: tripRide.id,
          userId: booking.passengerId,
          seatId: booking.seatId,
          // Stary przejazd był w jedną stronę — rezerwacja nie może
          // obejmować powrotu, którego nie ma.
          legs: 'OUTBOUND_ONLY',
          status: booking.status,
          createdAt: booking.createdAt,
        },
      });
    }

    // Wątki przeżywają zmianę modelu: dostają adres wycieczki i drugą stronę
    // rozmowy. `rideId` zostaje do etapu 6, żeby stary moduł dalej działał.
    const conversations = await tx.conversation.updateMany({
      where: { rideId: ride.id },
      data: { tripId: trip.id, driverId: ride.driverId },
    });

    await tx.legacyRideMigration.create({
      data: { legacyRideId: ride.id, tripId: trip.id, tripRideId: tripRide.id },
    });

    return {
      vehicleCreated: created,
      participants: 1 + ride.bookings.length,
      reservations: ride.bookings.length,
      conversations: conversations.count,
      title: trip.title,
      status: trip.status,
    };
  });
}

async function main() {
  const now = new Date();

  const rides = await prisma.ride.findMany({
    orderBy: { departureAt: 'asc' },
    select: { id: true, origin: true, destination: true, departureAt: true },
  });
  const done = new Set(
    (await prisma.legacyRideMigration.findMany({ select: { legacyRideId: true } })).map(
      (row) => row.legacyRideId,
    ),
  );

  console.log(`Starych przejazdów: ${rides.length}, już przeniesionych: ${done.size}\n`);

  for (const ride of rides) {
    const label = `${routeTitle(ride.origin, ride.destination)} (${ride.departureAt.toISOString()})`;

    if (done.has(ride.id)) {
      tally.skipped++;
      console.log(`  pomijam  ${label} — przeniesiony wcześniej`);
      continue;
    }
    if (dryRun) {
      console.log(`  [dry-run] przeniósłbym ${label}`);
      continue;
    }

    const result = await migrateRide(ride.id, now);
    if (!result) continue;

    tally.trips++;
    tally.legs++;
    if (result.vehicleCreated) tally.vehicles++;
    tally.participants += result.participants;
    tally.reservations += result.reservations;
    tally.conversations += result.conversations;
    console.log(`  przeniesiono  ${label} → „${result.title}" [${result.status}]`);
  }

  console.log('\nPodsumowanie');
  console.log(`  wycieczki:    ${tally.trips}`);
  console.log(`  pojazdy:      ${tally.vehicles}`);
  console.log(`  uczestnicy:   ${tally.participants}`);
  console.log(`  odcinki:      ${tally.legs}`);
  console.log(`  rezerwacje:   ${tally.reservations}`);
  console.log(`  wątki:        ${tally.conversations}`);
  console.log(`  pominięte:    ${tally.skipped}`);
  if (dryRun) console.log('\n(dry-run — nic nie zapisano)');
}

main()
  .catch((error) => {
    console.error('\nMigracja przerwana:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
