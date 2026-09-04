import type { ParticipantRole } from './types.js';

/**
 * Minimum, jakiego potrzeba do wyliczenia ról. Celowo strukturalne, a nie
 * `Trip` — pasuje i wiersz z Prismy po stronie API, i DTO po stronie weba,
 * więc obie strony liczą role tym samym kodem.
 */
export interface TripRoleContext {
  participants: readonly { userId: string; isOrganizer: boolean }[];
  rides: readonly {
    driverId: string;
    reservations: readonly { userId: string }[];
  }[];
}

/**
 * Rola w wycieczce nie jest zapisywana w bazie — wynika z danych:
 * kierowca ma w niej auto, pasażer ma rezerwację miejsca, a uczestnik bez
 * jednego i drugiego szuka miejsca. Zapisany jest tylko `isOrganizer`.
 *
 * Kolejność zwracanych ról jest stała (organizator, kierowca, pasażer,
 * szuka miejsca), żeby odznaki na liście uczestników nie skakały.
 *
 * Rezerwacja czekająca na kierowcę liczy się jak każda inna — fotel jest już
 * zablokowany, więc taka osoba nie szuka miejsca. To, że prośba czeka na
 * decyzję, niesie `SeatReservation.status`, nie rola.
 *
 * Osoba spoza wycieczki nie ma żadnej roli — zwracamy pustą listę.
 */
export function deriveParticipantRoles(userId: string, trip: TripRoleContext): ParticipantRole[] {
  const participant = trip.participants.find((p) => p.userId === userId);
  if (!participant) return [];

  const roles: ParticipantRole[] = [];
  if (participant.isOrganizer) roles.push('ORGANIZER');

  const isDriver = trip.rides.some((ride) => ride.driverId === userId);
  if (isDriver) roles.push('DRIVER');

  const isPassenger = trip.rides.some((ride) =>
    ride.reservations.some((reservation) => reservation.userId === userId),
  );
  if (isPassenger) roles.push('PASSENGER');

  // Kierowca siedzi we własnym aucie, więc miejsca nie szuka.
  if (!isDriver && !isPassenger) roles.push('LOOKING_FOR_SEAT');

  return roles;
}

/** Skrót dla list „szukają miejsca" i dla przycisków zależnych od stanu. */
export const hasRole = (roles: readonly ParticipantRole[], role: ParticipantRole) =>
  roles.includes(role);
