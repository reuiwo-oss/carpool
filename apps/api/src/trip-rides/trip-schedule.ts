import type { Prisma } from '@prisma/client';

/**
 * Ramy czasowe wycieczki wynikają z odcinków aut, nie z formularza:
 * wyjeżdżamy, gdy rusza pierwsze auto, wracamy, gdy dojedzie ostatnie.
 * Wołane po każdej zmianie odcinków — dodaniu auta, edycji godziny, usunięciu auta.
 *
 * Gdy w wycieczce nie ma jeszcze żadnego odcinka danego kierunku, zostawiamy
 * datę z formularza — lepsza niż żadna.
 */
export async function recomputeTripSchedule(tx: Prisma.TransactionClient, tripId: string) {
  const legs = await tx.tripRideLeg.findMany({
    where: { ride: { tripId } },
    select: { direction: true, departureAt: true, arrivalAt: true },
  });
  if (legs.length === 0) return;

  const trip = await tx.trip.findUnique({
    where: { id: tripId },
    select: { startsAt: true, endsAt: true },
  });
  if (!trip) return;

  const outbound = legs.filter((leg) => leg.direction === 'OUTBOUND');
  const back = legs.filter((leg) => leg.direction === 'RETURN');

  const startsAt = outbound.length
    ? new Date(Math.min(...outbound.map((leg) => leg.departureAt.getTime())))
    : trip.startsAt;

  // Powrót bez godziny przyjazdu liczymy po godzinie wyjazdu — i tak jest
  // to najpóźniejszy moment, o którym cokolwiek wiemy.
  const endsAt = back.length
    ? new Date(Math.max(...back.map((leg) => (leg.arrivalAt ?? leg.departureAt).getTime())))
    : trip.endsAt;

  await tx.trip.update({
    where: { id: tripId },
    data: { startsAt, endsAt: endsAt < startsAt ? startsAt : endsAt },
  });
}
