import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Seat } from '@carpool/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Wątek widzą tylko jego dwie strony: uczestnik i kierowca. */
const participantOf = (userId: string) => ({
  OR: [{ passengerId: userId }, { driverId: userId }],
});

const tripSummary = {
  select: { id: true, title: true, destination: true, startsAt: true },
} as const;

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  private seatLabel(snapshot: unknown, seatId: string | null) {
    if (!seatId) return null;
    return (snapshot as Seat[]).find((s) => s.id === seatId)?.label ?? seatId;
  }

  /** Liczba nieprzeczytanych — zasila kulkę przy ikonce Wiadomości. */
  unreadCount(userId: string) {
    return this.prisma.message
      .count({
        where: {
          readAt: null,
          senderId: { not: userId },
          conversation: participantOf(userId),
        },
      })
      .then((count) => ({ count }));
  }

  /**
   * Rezerwacja dla pary (wycieczka, uczestnik, kierowca) — czyli miejsce
   * pasażera w aucie tego kierowcy. Może już nie istnieć: odmowa i rezygnacja
   * kasują wiersz, a wątek zostaje.
   */
  private async reservationsFor(
    keys: { tripId: string; passengerId: string; driverId: string }[],
  ) {
    const found =
      keys.length === 0
        ? []
        : await this.prisma.seatReservation.findMany({
            where: {
              OR: keys.map((k) => ({
                userId: k.passengerId,
                ride: { tripId: k.tripId, driverId: k.driverId },
              })),
            },
            include: {
              ride: { select: { tripId: true, driverId: true, seatLayoutSnapshot: true } },
            },
          });
    return new Map(found.map((r) => [`${r.ride.tripId}:${r.userId}:${r.ride.driverId}`, r]));
  }

  async list(userId: string) {
    const rows = await this.prisma.conversation.findMany({
      where: participantOf(userId),
      include: {
        trip: tripSummary,
        passenger: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { name: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (rows.length === 0) return [];

    // Nieprzeczytane liczymy jednym zapytaniem zamiast N podzapytań.
    const unread = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: rows.map((r) => r.id) },
        readAt: null,
        senderId: { not: userId },
      },
      _count: { _all: true },
    });
    const unreadBy = new Map(unread.map((u) => [u.conversationId, u._count._all]));
    const reservations = await this.reservationsFor(rows);

    return rows.map((row) => {
      const reservation = reservations.get(`${row.tripId}:${row.passengerId}:${row.driverId}`) ?? null;
      const last = row.messages[0] ?? null;
      const seatId = reservation?.seatId ?? last?.seatId ?? null;
      return {
        id: row.id,
        tripId: row.tripId,
        // Druga strona rozmowy — zależy, kto pyta.
        withName: row.passengerId === userId ? row.driver.name : row.passenger.name,
        trip: row.trip,
        reservationStatus: reservation?.status ?? null,
        reservationId: reservation?.id ?? null,
        seatId,
        seatLabel: this.seatLabel(reservation?.ride.seatLayoutSnapshot, seatId),
        lastMessage: last && {
          id: last.id,
          conversationId: last.conversationId,
          senderId: last.senderId,
          senderName: last.sender.name,
          kind: last.kind,
          body: last.body,
          seatId: last.seatId,
          readAt: last.readAt,
          createdAt: last.createdAt,
        },
        unreadCount: unreadBy.get(row.id) ?? 0,
        updatedAt: row.updatedAt,
      };
    });
  }

  /** Otwarcie wątku oznacza cudze wiadomości jako przeczytane. */
  async get(userId: string, id: string) {
    const row = await this.prisma.conversation.findFirst({
      where: { id, ...participantOf(userId) },
      include: {
        trip: tripSummary,
        passenger: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { name: true } } },
        },
      },
    });
    if (!row) throw new NotFoundException('Wątek nie istnieje');

    await this.prisma.message.updateMany({
      where: { conversationId: id, readAt: null, senderId: { not: userId } },
      data: { readAt: new Date() },
    });

    const reservations = await this.reservationsFor([row]);
    const reservation = reservations.get(`${row.tripId}:${row.passengerId}:${row.driverId}`) ?? null;

    return {
      id: row.id,
      tripId: row.tripId,
      withName: row.passengerId === userId ? row.driver.name : row.passenger.name,
      /** Kierowca widzi przyciski decyzji, pasażer nie. */
      isDriver: row.driverId === userId,
      trip: row.trip,
      reservationStatus: reservation?.status ?? null,
      reservationId: reservation?.id ?? null,
      seatId: reservation?.seatId ?? null,
      seatLabel: this.seatLabel(reservation?.ride.seatLayoutSnapshot, reservation?.seatId ?? null),
      messages: row.messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: m.sender.name,
        kind: m.kind,
        body: m.body,
        seatId: m.seatId,
        readAt: m.readAt,
        createdAt: m.createdAt,
      })),
      updatedAt: row.updatedAt,
    };
  }

  async send(userId: string, id: string, body: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, ...participantOf(userId) },
      select: { id: true },
    });
    if (!conversation) throw new ForbiddenException('To nie jest twój wątek');

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId: id, senderId: userId, kind: 'TEXT', body: body.trim() },
        include: { sender: { select: { name: true } } },
      }),
      this.prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } }),
    ]);

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: message.sender.name,
      kind: message.kind,
      body: message.body,
      seatId: message.seatId,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }
}
