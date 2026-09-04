import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { MessageKind, Seat } from '@carpool/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TripAccessService } from '../trips/trip-access.service';
import { CreateReservationDto } from './reservations.dto';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService, private access: TripAccessService) {}

  /**
   * Prośba o fotel. Blokuje miejsce od razu — unikalne indeksy w bazie
   * pilnują tego nawet przy równoczesnych żądaniach — ale jedzie dopiero
   * po decyzji kierowcy tego auta. Notatka pasażera ląduje jako pierwsza
   * wiadomość w wątku.
   */
  async create(userId: string, tripId: string, rideId: string, dto: CreateReservationDto) {
    await this.access.assertParticipant(tripId, userId);

    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
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
    const elsewhere = await this.prisma.seatReservation.findFirst({
      where: { userId, ride: { tripId } },
    });
    if (elsewhere) throw new ConflictException('Masz już miejsce w tej wycieczce');

    return this.prisma.$transaction(async (tx) => {
      let reservation;
      try {
        reservation = await tx.seatReservation.create({
          data: { rideId, userId, seatId: dto.seatId, legs: dto.legs ?? 'BOTH' },
        });
      } catch {
        throw new ConflictException('To miejsce jest już zajęte');
      }

      const conversationId = await this.addEvent(tx, {
        tripId,
        passengerId: userId,
        driverId: ride.driverId,
        senderId: userId,
        kind: 'REQUEST',
        seatId: dto.seatId,
        body: dto.note?.trim() ?? '',
      });

      return { ...reservation, conversationId };
    });
  }

  /** Kierowca potwierdza — dopiero teraz pasażer faktycznie jedzie. */
  async accept(userId: string, reservationId: string) {
    const reservation = await this.load(reservationId);
    await this.access.assertRideDriver(reservation.rideId, userId);
    if (reservation.status === 'ACCEPTED') return reservation;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.seatReservation.update({
        where: { id: reservationId },
        data: { status: 'ACCEPTED' },
      });
      await this.addEvent(tx, {
        tripId: reservation.ride.tripId,
        passengerId: reservation.userId,
        driverId: userId,
        senderId: userId,
        kind: 'ACCEPTED',
        seatId: reservation.seatId,
        body: `Potwierdzam — miejsce ${this.seatLabel(reservation.ride.seatLayoutSnapshot, reservation.seatId)} jest twoje.`,
      });
      return updated;
    });
  }

  /**
   * Rezygnacja pasażera i odmowa kierowcy to ta sama operacja: wiersz znika,
   * żeby miejsce natychmiast wróciło do puli — unikalny indeks na
   * (rideId, seatId) nie umie pomijać martwych rekordów. Ślad zostaje
   * w wątku, który żyje niezależnie od rezerwacji.
   */
  async remove(userId: string, reservationId: string) {
    const reservation = await this.load(reservationId);
    const isOwner = reservation.userId === userId;
    const isDriver = reservation.ride.driverId === userId;
    if (!isOwner && !isDriver) {
      throw new ForbiddenException('To nie jest twoja rezerwacja');
    }

    const label = this.seatLabel(reservation.ride.seatLayoutSnapshot, reservation.seatId);

    await this.prisma.$transaction(async (tx) => {
      await tx.seatReservation.delete({ where: { id: reservationId } });
      await this.addEvent(tx, {
        tripId: reservation.ride.tripId,
        passengerId: reservation.userId,
        driverId: reservation.ride.driverId,
        senderId: userId,
        kind: isOwner ? 'CANCELLED' : 'REJECTED',
        seatId: reservation.seatId,
        body: isOwner
          ? `Rezygnuję z miejsca ${label}.`
          : `Niestety nie tym razem — miejsce ${label} nie jest wolne.`,
      });
    });
    return { ok: true };
  }

  private async load(reservationId: string) {
    const reservation = await this.prisma.seatReservation.findUnique({
      where: { id: reservationId },
      include: {
        ride: { select: { driverId: true, tripId: true, seatLayoutSnapshot: true } },
      },
    });
    if (!reservation) throw new NotFoundException('Rezerwacja nie istnieje');
    return reservation;
  }

  /** Etykieta miejsca z zapisanego układu — do treści zdarzeń w wątku. */
  private seatLabel(snapshot: unknown, seatId: string) {
    return (snapshot as Seat[]).find((s) => s.id === seatId)?.label ?? seatId;
  }

  /**
   * Zdarzenie dopisane do wątku pary (uczestnik, kierowca) w tej wycieczce.
   * Wątek tworzymy przy pierwszym zdarzeniu i potem tylko dopisujemy.
   */
  private async addEvent(
    tx: Prisma.TransactionClient,
    event: {
      tripId: string;
      passengerId: string;
      driverId: string;
      senderId: string;
      kind: MessageKind;
      seatId: string;
      body: string;
    },
  ) {
    const { tripId, passengerId, driverId } = event;
    const conversation = await tx.conversation.upsert({
      where: { tripId_passengerId_driverId: { tripId, passengerId, driverId } },
      create: { tripId, passengerId, driverId },
      update: { updatedAt: new Date() },
    });
    await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: event.senderId,
        kind: event.kind,
        seatId: event.seatId,
        body: event.body,
      },
    });
    return conversation.id;
  }
}
