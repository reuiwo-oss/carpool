import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Seat } from '@carpool/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  /** Etykieta miejsca z układu auta — do treści zdarzeń w wątku. */
  private seatLabel(seatLayout: unknown, seatId: string) {
    return (seatLayout as Seat[]).find((s) => s.id === seatId)?.label ?? seatId;
  }

  /**
   * Pasażer prosi o miejsce. Prośba od razu blokuje fotel (unikalne indeksy
   * w bazie), ale jedzie dopiero po akceptacji kierowcy. Notatka pasażera
   * ląduje jako pierwsza wiadomość w wątku.
   */
  async request(passengerId: string, rideId: string, seatId: string, note: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Przejazd nie istnieje');
    if (ride.driverId === passengerId) {
      throw new BadRequestException('Nie możesz zarezerwować miejsca we własnym przejeździe');
    }

    const layout = ride.seatLayout as unknown as Seat[];
    const seat = layout.find((s) => s.id === seatId);
    if (!seat || seat.status === 'DRIVER') {
      throw new BadRequestException('Nieprawidłowe miejsce');
    }

    return this.prisma.$transaction(async (tx) => {
      let booking;
      try {
        // Unikalne indeksy (@@unique) gwarantują brak podwójnych próśb
        // nawet przy równoczesnych żądaniach.
        booking = await tx.booking.create({
          data: { rideId, seatId, passengerId, status: 'PENDING' },
        });
      } catch {
        throw new ConflictException(
          'To miejsce jest już zajęte albo masz już prośbę w tym przejeździe',
        );
      }

      // Wątek przeżywa odrzucenie prośby, więc tworzymy go raz na parę
      // (przejazd, pasażer) i potem tylko dopisujemy wiadomości.
      const conversation = await tx.conversation.upsert({
        where: { rideId_passengerId: { rideId, passengerId } },
        create: { rideId, passengerId },
        update: { updatedAt: new Date() },
      });

      await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: passengerId,
          kind: 'REQUEST',
          seatId,
          body: note.trim(),
        },
      });

      return { ...booking, conversationId: conversation.id };
    });
  }

  /** Kierowca potwierdza — dopiero teraz pasażer faktycznie jedzie. */
  async accept(driverId: string, bookingId: string) {
    const booking = await this.loadForDriver(driverId, bookingId);
    if (booking.status === 'ACCEPTED') return booking;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'ACCEPTED' },
      });
      await this.addEvent(tx, booking.rideId, booking.passengerId, driverId, 'ACCEPTED', booking.seatId,
        `Potwierdzam — miejsce ${this.seatLabel(booking.ride.seatLayout, booking.seatId)} jest twoje.`);
      return updated;
    });
  }

  /**
   * Odrzucenie kasuje rezerwację, żeby miejsce natychmiast wróciło do puli —
   * unikalny indeks na (rideId, seatId) nie umie pomijać martwych wierszy.
   * Ślad zostaje w wątku, który jest niezależny od rezerwacji.
   */
  async reject(driverId: string, bookingId: string) {
    const booking = await this.loadForDriver(driverId, bookingId);

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.delete({ where: { id: bookingId } });
      await this.addEvent(tx, booking.rideId, booking.passengerId, driverId, 'REJECTED', booking.seatId,
        `Niestety nie tym razem — miejsce ${this.seatLabel(booking.ride.seatLayout, booking.seatId)} nie jest wolne.`);
    });
    return { ok: true };
  }

  /** Pasażer wycofuje się — działa i na prośbę, i na potwierdzoną rezerwację. */
  async cancel(passengerId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { ride: true },
    });
    if (!booking) throw new NotFoundException('Rezerwacja nie istnieje');
    if (booking.passengerId !== passengerId) {
      throw new ForbiddenException('Możesz anulować tylko własne rezerwacje');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.delete({ where: { id: bookingId } });
      await this.addEvent(tx, booking.rideId, passengerId, passengerId, 'CANCELLED', booking.seatId,
        `Rezygnuję z miejsca ${this.seatLabel(booking.ride.seatLayout, booking.seatId)}.`);
    });
    return { ok: true };
  }

  forPassenger(passengerId: string) {
    return this.prisma.booking.findMany({
      where: { passengerId },
      include: {
        ride: {
          include: {
            driver: { select: { name: true } },
            // Same identyfikatory miejsc — miniatura schematu na ekranie „Moje"
            // pokazuje obsadę auta, ale imion pasażerowie nie widzą.
            bookings: { select: { seatId: true, status: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async loadForDriver(driverId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { ride: true },
    });
    if (!booking) throw new NotFoundException('Prośba nie istnieje');
    if (booking.ride.driverId !== driverId) {
      throw new ForbiddenException('To nie jest twój przejazd');
    }
    return booking;
  }

  /** Zdarzenie dopisane do wątku; wątek tworzymy, jeśli go jeszcze nie ma. */
  private async addEvent(
    tx: any,
    rideId: string,
    passengerId: string,
    senderId: string,
    kind: 'ACCEPTED' | 'REJECTED' | 'CANCELLED',
    seatId: string,
    body: string,
  ) {
    const conversation = await tx.conversation.upsert({
      where: { rideId_passengerId: { rideId, passengerId } },
      create: { rideId, passengerId },
      update: { updatedAt: new Date() },
    });
    await tx.message.create({
      data: { conversationId: conversation.id, senderId, kind, seatId, body },
    });
  }
}
