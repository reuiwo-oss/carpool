import type { Seat } from '@carpool/shared';

/**
 * Nakładanie rezerwacji na zapisany układ miejsc — przeniesione z
 * `RidesService.getWithSeats`, teraz wspólne dla wszystkich aut w wycieczce.
 */

export interface ReservationRow {
  seatId: string;
  userId: string;
  status: 'PENDING' | 'ACCEPTED';
  user?: { name: string };
}

export interface SeatViewer {
  viewerId: string;
  driverId: string;
  /**
   * Kto gdzie siedzi, widzą uczestnicy wycieczki — skład i tak jest dla nich
   * jawny na liście uczestników. Z zewnątrz miejsce jest po prostu zajęte.
   */
  showNames: boolean;
}

const seatsOf = (snapshot: unknown) => (snapshot ?? []) as unknown as Seat[];

/** Miejsca pasażerskie, czyli wszystko poza fotelem kierowcy. */
export const passengerSeats = (snapshot: unknown) =>
  seatsOf(snapshot).filter((seat) => seat.status !== 'DRIVER');

export const countFreeSeats = (snapshot: unknown, reservationCount: number) =>
  Math.max(0, passengerSeats(snapshot).length - reservationCount);

export function seatsWithReservations(
  snapshot: unknown,
  driverName: string,
  reservations: ReservationRow[],
  viewer: SeatViewer,
): Seat[] {
  const bySeat = new Map(reservations.map((r) => [r.seatId, r]));

  return seatsOf(snapshot).map((seat) => {
    if (seat.status === 'DRIVER') {
      return viewer.showNames ? { ...seat, who: driverName } : seat;
    }

    const reservation = bySeat.get(seat.id);
    if (!reservation) return { ...seat, status: 'FREE' as const };

    // Oczekującą prośbę widzą tylko zainteresowani: proszący i kierowca, który
    // ma zdecydować. Dla reszty miejsce jest po prostu zajęte.
    const concerns = viewer.viewerId === viewer.driverId || reservation.userId === viewer.viewerId;
    const status: Seat['status'] =
      reservation.status === 'PENDING' && concerns ? 'PENDING' : 'TAKEN';

    return {
      ...seat,
      status,
      ...(viewer.showNames && reservation.user ? { who: reservation.user.name } : {}),
    };
  });
}
