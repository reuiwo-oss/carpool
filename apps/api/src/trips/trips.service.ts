import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  deriveParticipantRoles,
  type MyTrips,
  type ParticipantRole,
  type Trip,
  type TripStatus,
  type TripSummary,
  type TripVisibility,
} from '@carpool/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TripAccessService } from './trip-access.service';
import { countFreeSeats, seatsWithReservations } from './seat-state';
import { CreateTripDto, UpdateTripDto } from './trips.dto';

/** Wspólny zestaw pól listy — bez uczestników i aut, te dochodzą osobno. */
interface SummaryRow {
  id: string;
  title: string;
  destination: string;
  startsAt: Date;
  endsAt: Date;
  visibility: TripVisibility;
  status: TripStatus;
  createdById: string;
  createdBy: { name: string };
}

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService, private access: TripAccessService) {}

  /** Tablica ogłoszeń: publiczne, jeszcze nieodbyte, najbliższe u góry. */
  async list(): Promise<TripSummary[]> {
    const rows = await this.prisma.trip.findMany({
      where: {
        visibility: 'PUBLIC',
        status: { in: ['OPEN', 'CONFIRMED'] },
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: 'asc' },
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { participants: true } },
        rides: {
          select: { seatLayoutSnapshot: true, _count: { select: { reservations: true } } },
        },
      },
    });

    return rows.map((row) =>
      this.toSummary(
        row,
        this.sumFreeSeats(row.rides.map((r) => [r.seatLayoutSnapshot, r._count.reservations])),
        row._count.participants,
      ),
    );
  }

  /**
   * Historia i plany zalogowanego użytkownika. Podział po `endsAt`: wycieczka
   * jest „nadchodząca" do chwili, w której wróciliśmy, a nie w której wyjechaliśmy.
   */
  async mine(userId: string): Promise<MyTrips> {
    const rows = await this.prisma.trip.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { startsAt: 'asc' },
      include: {
        createdBy: { select: { name: true } },
        participants: { select: { userId: true, isOrganizer: true } },
        rides: {
          select: {
            driverId: true,
            seatLayoutSnapshot: true,
            reservations: { select: { userId: true } },
          },
        },
      },
    });

    const now = new Date();
    const upcoming: TripSummary[] = [];
    const past: TripSummary[] = [];

    for (const row of rows) {
      const summary = this.toSummary(
        row,
        this.sumFreeSeats(row.rides.map((r) => [r.seatLayoutSnapshot, r.reservations.length])),
        row.participants.length,
        deriveParticipantRoles(userId, row),
      );
      (row.endsAt >= now ? upcoming : past).push(summary);
    }

    // Odbyte czytamy od najświeższych — to jest historia, nie kolejka.
    past.reverse();
    return { upcoming, past };
  }

  async getOne(id: string, viewerId: string): Promise<Trip> {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        participants: {
          orderBy: { joinedAt: 'asc' },
          include: { user: { select: { name: true, avatarUrl: true } } },
        },
        rides: {
          orderBy: { createdAt: 'asc' },
          include: {
            driver: { select: { name: true } },
            legs: { orderBy: { direction: 'asc' } },
            reservations: {
              orderBy: { createdAt: 'asc' },
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
    });
    if (!trip) throw new NotFoundException('Wycieczka nie istnieje');

    const isParticipant = trip.participants.some((p) => p.userId === viewerId);
    // LINK_ONLY jest dla każdego, kto zna id — samo id jest zaproszeniem.
    if (trip.visibility === 'PRIVATE' && !isParticipant) {
      throw new ForbiddenException('Ta wycieczka jest prywatna');
    }

    const rides = trip.rides.map((ride) => ({
      id: ride.id,
      tripId: ride.tripId,
      driverId: ride.driverId,
      driverName: ride.driver.name,
      vehicleId: ride.vehicleId,
      interior: ride.interior,
      note: ride.note,
      seats: seatsWithReservations(ride.seatLayoutSnapshot, ride.driver.name, ride.reservations, {
        viewerId,
        driverId: ride.driverId,
        showNames: isParticipant,
      }),
      legs: ride.legs.map((leg) => ({
        id: leg.id,
        rideId: leg.rideId,
        direction: leg.direction,
        origin: leg.origin,
        departureAt: leg.departureAt.toISOString(),
        arrivalAt: leg.arrivalAt?.toISOString() ?? null,
      })),
      reservations: ride.reservations.map((r) => ({
        id: r.id,
        rideId: r.rideId,
        userId: r.userId,
        seatId: r.seatId,
        legs: r.legs,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    }));

    const summary = this.toSummary(
      trip,
      this.sumFreeSeats(trip.rides.map((r) => [r.seatLayoutSnapshot, r.reservations.length])),
      trip.participants.length,
    );

    return {
      ...summary,
      description: trip.description,
      createdAt: trip.createdAt.toISOString(),
      participants: trip.participants.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
        isOrganizer: p.isOrganizer,
        joinedAt: p.joinedAt.toISOString(),
        roles: deriveParticipantRoles(p.userId, trip),
      })),
      rides,
    };
  }

  /** Wycieczka i jej organizator powstają razem — jedno bez drugiego nie ma sensu. */
  async create(userId: string, dto: CreateTripDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt < startsAt) {
      throw new BadRequestException('Powrót nie może być wcześniej niż wyjazd');
    }

    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          title: dto.title.trim(),
          destination: dto.destination.trim(),
          description: dto.description?.trim() || null,
          startsAt,
          endsAt,
          visibility: dto.visibility ?? 'PUBLIC',
          createdById: userId,
        },
      });
      await tx.tripParticipant.create({
        data: { tripId: trip.id, userId, isOrganizer: true },
      });
      return trip;
    });
  }

  /** Dołączenie bez auta i bez miejsca — to już jest sygnał „szukam miejsca". */
  async join(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Wycieczka nie istnieje');
    if (trip.status === 'DONE' || trip.status === 'CANCELLED') {
      throw new BadRequestException('Ta wycieczka jest już zamknięta');
    }
    if (trip.visibility === 'PRIVATE') {
      throw new ForbiddenException('Do prywatnej wycieczki dołączysz tylko z zaproszenia');
    }

    // Powtórne kliknięcie „Dołącz" nie jest błędem.
    await this.prisma.tripParticipant.upsert({
      where: { tripId_userId: { tripId, userId } },
      create: { tripId, userId },
      update: {},
    });
    return { ok: true };
  }

  async leave(tripId: string, userId: string) {
    const participant = await this.access.assertParticipant(tripId, userId);

    const ownRides = await this.prisma.tripRide.count({ where: { tripId, driverId: userId } });
    if (ownRides > 0) {
      throw new BadRequestException('Najpierw wypisz z wycieczki swoje auto');
    }

    if (participant.isOrganizer) {
      const organizers = await this.prisma.tripParticipant.count({
        where: { tripId, isOrganizer: true },
      });
      if (organizers <= 1) {
        throw new BadRequestException(
          'Jesteś jedynym organizatorem — przekaż organizację albo anuluj wycieczkę',
        );
      }
    }

    // Miejsce zwalnia się razem z uczestnictwem — inaczej fotel zostałby
    // zajęty przez kogoś, kogo nie ma już w wycieczce.
    await this.prisma.$transaction([
      this.prisma.tripSeatReservation.deleteMany({ where: { userId, ride: { tripId } } }),
      this.prisma.tripParticipant.delete({ where: { tripId_userId: { tripId, userId } } }),
    ]);
    return { ok: true };
  }

  async update(tripId: string, userId: string, dto: UpdateTripDto) {
    await this.access.assertOrganizer(tripId, userId);
    return this.prisma.trip.update({
      where: { id: tripId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.destination !== undefined ? { destination: dto.destination.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  private sumFreeSeats(rides: [unknown, number][]) {
    return rides.reduce((sum, [snapshot, taken]) => sum + countFreeSeats(snapshot, taken), 0);
  }

  private toSummary(
    row: SummaryRow,
    freeSeats: number,
    participantsCount: number,
    myRoles?: ParticipantRole[],
  ): TripSummary {
    return {
      id: row.id,
      title: row.title,
      destination: row.destination,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      visibility: row.visibility,
      status: row.status,
      createdById: row.createdById,
      organizerName: row.createdBy.name,
      freeSeats,
      participantsCount,
      ...(myRoles ? { myRoles } : {}),
    };
  }
}
