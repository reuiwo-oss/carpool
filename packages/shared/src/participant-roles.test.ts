import { describe, expect, it } from 'vitest';
import { deriveParticipantRoles, type TripRoleContext } from './participant-roles.js';

/**
 * Wycieczka do testów: Ala organizuje i wiezie własnym autem, Bartek ma u niej
 * fotel, Celina dołączyła i nic więcej nie zrobiła, Damian ma drugie auto.
 */
const trip: TripRoleContext = {
  participants: [
    { userId: 'ala', isOrganizer: true },
    { userId: 'bartek', isOrganizer: false },
    { userId: 'celina', isOrganizer: false },
    { userId: 'damian', isOrganizer: false },
  ],
  rides: [
    { driverId: 'ala', reservations: [{ userId: 'bartek' }] },
    { driverId: 'damian', reservations: [] },
  ],
};

describe('deriveParticipantRoles', () => {
  it('organizator z własnym autem jest też kierowcą', () => {
    expect(deriveParticipantRoles('ala', trip)).toEqual(['ORGANIZER', 'DRIVER']);
  });

  it('uczestnik z rezerwacją jest pasażerem', () => {
    expect(deriveParticipantRoles('bartek', trip)).toEqual(['PASSENGER']);
  });

  it('uczestnik bez auta i bez miejsca szuka miejsca', () => {
    expect(deriveParticipantRoles('celina', trip)).toEqual(['LOOKING_FOR_SEAT']);
  });

  it('osoba spoza wycieczki nie ma żadnej roli', () => {
    expect(deriveParticipantRoles('ktoś-obcy', trip)).toEqual([]);
  });

  it('kierowca bez pasażerów nie szuka miejsca', () => {
    expect(deriveParticipantRoles('damian', trip)).toEqual(['DRIVER']);
  });

  it('organizator bez auta i bez miejsca szuka miejsca', () => {
    const noCar: TripRoleContext = {
      participants: [{ userId: 'ala', isOrganizer: true }],
      rides: [],
    };
    expect(deriveParticipantRoles('ala', noCar)).toEqual(['ORGANIZER', 'LOOKING_FOR_SEAT']);
  });

  it('czekająca prośba o miejsce już liczy się jak rezerwacja', () => {
    // Fotel jest zablokowany od chwili prośby — stan decyzji niesie
    // `SeatReservation.status`, nie rola uczestnika.
    const pending: TripRoleContext = {
      participants: [
        { userId: 'ala', isOrganizer: true },
        { userId: 'bartek', isOrganizer: false },
      ],
      rides: [{ driverId: 'ala', reservations: [{ userId: 'bartek' }] }],
    };
    expect(deriveParticipantRoles('bartek', pending)).toEqual(['PASSENGER']);
  });

  it('pasażer w cudzym aucie, który dołożył własne, jest kierowcą i pasażerem', () => {
    const both: TripRoleContext = {
      participants: [
        { userId: 'ala', isOrganizer: true },
        { userId: 'bartek', isOrganizer: false },
      ],
      rides: [
        { driverId: 'ala', reservations: [{ userId: 'bartek' }] },
        { driverId: 'bartek', reservations: [] },
      ],
    };
    expect(deriveParticipantRoles('bartek', both)).toEqual(['DRIVER', 'PASSENGER']);
  });
});
