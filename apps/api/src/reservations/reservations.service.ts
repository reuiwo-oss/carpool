import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Seat } from '@carpool/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TripAccessService } from '../trips/trip-access.service';
import { CreateReservationDto } from './reservations.dto';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService, private access: TripAccessService) {}

  /**
   * Prośba o fotel. Blokuje miejsce od razu — unikalne indeksy w bazie
   * pilnują tego nawet przy równoczesnych żądaniach — ale jedzie dopiero
   * po decyzji kierowcy tego auta.
   */
  async create(userId: string, tripId: string, rideId: string, dto: CreateReservationDto) {
    await this.access.assertParticipant(tripId, userId);

    const ride = await this.prisma.tripRide.findUnique({ where: { id: rideId } });
    if (!ride || ride.tripId !== tripId) {
      throw new NotFoundException('To auto nie jedzie w tej wycieczce');
    }
    if (ride.driverId === userId) {
      throw new BadRequestException('Prowadzisz to auto — masz w nim miejsce kierowcy');
    }

    const seat = (ride.seatLayoutSnapshot as unknown as Seat[]).find((s) => s.id === dto.seatId);
    if (!seat || seat.status === 'DRIVER') {
      throw new BadRequestException('Nieprawidłowe miejsce');
    }

    // Wycieczka to jeden wyjazd — siedzi się w jednym aucie. Sam indeks
    // `@@unique([rideId, userId])` pilnuje tylko pojedynczego auta.
    const elsewhere = await this.prisma.tripSeatReservation.findFirst({
      where: { userId, ride: { tripId } },
    });
    if (elsewhere) throw new ConflictException('Masz już miejsce w tej wycieczce');

    try {
      return await this.prisma.tripSeatReservation.create({
        data: { rideId, userId, seatId: dto.seatId, legs: dto.legs ?? 'BOTH' },
      });
    } catch {
      throw new ConflictException('To miejsce jest już zajęte');
    }
  }

  /** Kierowca potwierdza — dopiero teraz pasażer faktycznie jedzie. */
  async accept(userId: string, reservationId: string) {
    const reservation = await this.load(reservationId);
    await this.access.assertRideDriver(reservation.rideId, userId);
    if (reservation.status === 'ACCEPTED') return reservation;

    return this.prisma.tripSeatReservation.update({
      where: { id: reservationId },
      data: { status: 'ACCEPTED' },
    });
  }

  /**
   * Rezygnacja pasażera i odmowa kierowcy to ta sama operacja: wiersz znika,
   * żeby miejsce natychmiast wróciło do puli — unikalny indeks na
   * (rideId, seatId) nie umie pomijać martwych rekordów.
   */
  async remove(userId: string, reservationId: string) {
    const reservation = await this.load(reservationId);
    const isOwner = reservation.userId === userId;
    const isDriver = reservation.ride.driverId === userId;
    if (!isOwner && !isDriver) {
      throw new ForbiddenException('To nie jest twoja rezerwacja');
    }

    await this.prisma.tripSeatReservation.delete({ where: { id: reservationId } });
    return { ok: true };
  }

  private async load(reservationId: string) {
    const reservation = await this.prisma.tripSeatReservation.findUnique({
      where: { id: reservationId },
      include: { ride: { select: { driverId: true, tripId: true } } },
    });
    if (!reservation) throw new NotFoundException('Rezerwacja nie istnieje');
    return reservation;
  }
}
