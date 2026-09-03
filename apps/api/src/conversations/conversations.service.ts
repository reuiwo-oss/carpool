import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Seat } from '@carpool/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Wątek widzi tylko jego pasażer i kierowca przejazdu. */
const participantOf = (userId: string) => ({
  OR: [{ passengerId: userId }, { ride: { driverId: userId } }],
});

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  private seatLabel(seatLayout: unknown, seatId: string | null) {
    if (!seatId) return null;
    return (seatLayout as Seat[]).find((s) => s.id === seatId)?.label ?? seatId;
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

  async list(userId: string) {
    const rows = await this.prisma.conversation.findMany({
      where: participantOf(userId),
      include: {
        ride: { include: { driver: { select: { id: true, name: true } } } },
        passenger: { select: { id: true, name: true } },
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

    // Prośba może już nie istnieć (odrzucona/anulowana) — wątek zostaje.
    const bookings = await this.prisma.booking.findMany({
      where: { OR: rows.map((r) => ({ rideId: r.rideId, passengerId: r.passengerId })) },
    });
    const bookingBy = new Map(bookings.map((b) => [`${b.rideId}:${b.passengerId}`, b]));

    return rows.map((row) => {
      const booking = bookingBy.get(`${row.rideId}:${row.passengerId}`) ?? null;
      const last = row.messages[0] ?? null;
      const seatId = booking?.seatId ?? last?.seatId ?? null;
      return {
        id: row.id,
        rideId: row.rideId,
        // Druga strona rozmowy — zależy, kto pyta.
        withName: row.passengerId === userId ? row.ride.driver.name : row.passenger.name,
        ride: {
          id: row.ride.id,
          origin: row.ride.origin,
          destination: row.ride.destination,
          departureAt: row.ride.departureAt,
          carModel: row.ride.carModel,
        },
        bookingStatus: booking?.status ?? null,
        bookingId: booking?.id ?? null,
        seatId,
        seatLabel: this.seatLabel(row.ride.seatLayout, seatId),
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
        ride: { include: { driver: { select: { id: true, name: true } } } },
        passenger: { select: { id: true, name: true } },
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

    const booking = await this.prisma.booking.findUnique({
      where: { rideId_passengerId: { rideId: row.rideId, passengerId: row.passengerId } },
    });

    return {
      id: row.id,
      rideId: row.rideId,
      withName: row.passengerId === userId ? row.ride.driver.name : row.passenger.name,
      /** Kierowca widzi przyciski decyzji, pasażer nie. */
      isDriver: row.ride.driverId === userId,
      ride: {
        id: row.ride.id,
        origin: row.ride.origin,
        destination: row.ride.destination,
        departureAt: row.ride.departureAt,
        carModel: row.ride.carModel,
      },
      bookingStatus: booking?.status ?? null,
      bookingId: booking?.id ?? null,
      seatId: booking?.seatId ?? null,
      seatLabel: this.seatLabel(row.ride.seatLayout, booking?.seatId ?? null),
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
