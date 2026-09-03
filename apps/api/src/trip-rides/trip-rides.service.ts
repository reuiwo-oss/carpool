import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { LegDirection } from '@carpool/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TripAccessService } from '../trips/trip-access.service';
import { recomputeTripSchedule } from './trip-schedule';
import { CreateTripRideDto, LEG_DIRECTIONS, UpdateRideLegDto } from './trip-rides.dto';

@Injectable()
export class TripRidesService {
  constructor(private prisma: PrismaService, private access: TripAccessService) {}

  /**
   * Każdy uczestnik może dołożyć własne auto — organizator niczego nie
   * zatwierdza. Układ miejsc kopiujemy z pojazdu, żeby późniejsza zmiana
   * w garażu nie przestawiała foteli ludziom, którzy już je zajęli.
   */
  async create(userId: string, tripId: string, dto: CreateTripRideDto) {
    await this.access.assertParticipant(tripId, userId);

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Pojazd nie istnieje');
    if (vehicle.ownerId !== userId) {
      throw new ForbiddenException('Do wycieczki zgłaszasz tylko własne auto');
    }

    const already = await this.prisma.tripRide.findUnique({
      where: { tripId_driverId: { tripId, driverId: userId } },
    });
    if (already) throw new ConflictException('Masz już auto w tej wycieczce');

    this.assertLegsMakeSense(dto);

    return this.prisma.$transaction(async (tx) => {
      const ride = await tx.tripRide.create({
        data: {
          tripId,
          driverId: userId,
          vehicleId: vehicle.id,
          interior: vehicle.interior,
          seatLayoutSnapshot: vehicle.seatLayout as object,
          note: dto.note?.trim() || null,
          legs: {
            create: dto.legs.map((leg) => ({
              direction: leg.direction,
              origin: leg.origin.trim(),
              departureAt: new Date(leg.departureAt),
              arrivalAt: leg.arrivalAt ? new Date(leg.arrivalAt) : null,
            })),
          },
        },
        include: { legs: { orderBy: { direction: 'asc' } } },
      });

      await recomputeTripSchedule(tx, tripId);
      return ride;
    });
  }

  /** Zmiana godziny albo miejsca zbiórki — tylko kierowca tego auta. */
  async updateLeg(
    userId: string,
    tripId: string,
    rideId: string,
    direction: string,
    dto: UpdateRideLegDto,
  ) {
    if (!LEG_DIRECTIONS.includes(direction as LegDirection)) {
      throw new BadRequestException('Nieprawidłowy odcinek');
    }
    const ride = await this.access.assertRideDriver(rideId, userId);
    if (ride.tripId !== tripId) throw new NotFoundException('To auto nie jedzie w tej wycieczce');

    const leg = await this.prisma.tripRideLeg.findUnique({
      where: { rideId_direction: { rideId, direction: direction as LegDirection } },
    });
    if (!leg) throw new NotFoundException('Ten odcinek nie istnieje');

    const departureAt = dto.departureAt ? new Date(dto.departureAt) : leg.departureAt;
    const arrivalAt = dto.arrivalAt ? new Date(dto.arrivalAt) : leg.arrivalAt;
    if (arrivalAt && arrivalAt < departureAt) {
      throw new BadRequestException('Przyjazd nie może być wcześniej niż wyjazd');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tripRideLeg.update({
        where: { id: leg.id },
        data: {
          ...(dto.origin !== undefined ? { origin: dto.origin.trim() } : {}),
          departureAt,
          arrivalAt,
        },
      });
      await recomputeTripSchedule(tx, tripId);
      return updated;
    });
  }

  /** Kierowca wypisuje własne auto; organizator może wypisać każde. */
  async remove(userId: string, tripId: string, rideId: string) {
    const ride = await this.prisma.tripRide.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('To auto nie istnieje');
    if (ride.tripId !== tripId) throw new NotFoundException('To auto nie jedzie w tej wycieczce');
    if (ride.driverId !== userId) await this.access.assertOrganizer(tripId, userId);

    await this.prisma.$transaction(async (tx) => {
      // Odcinki i rezerwacje schodzą kaskadą (onDelete: Cascade w schemacie).
      await tx.tripRide.delete({ where: { id: rideId } });
      await recomputeTripSchedule(tx, tripId);
    });
    return { ok: true };
  }

  private assertLegsMakeSense(dto: CreateTripRideDto) {
    const directions = new Set(dto.legs.map((leg) => leg.direction));
    if (directions.size !== dto.legs.length) {
      throw new BadRequestException('Każdy kierunek może wystąpić tylko raz');
    }

    for (const leg of dto.legs) {
      if (leg.arrivalAt && new Date(leg.arrivalAt) < new Date(leg.departureAt)) {
        throw new BadRequestException('Przyjazd nie może być wcześniej niż wyjazd');
      }
    }

    const there = dto.legs.find((leg) => leg.direction === 'OUTBOUND');
    const back = dto.legs.find((leg) => leg.direction === 'RETURN');
    if (there && back && new Date(back.departureAt) < new Date(there.departureAt)) {
      throw new BadRequestException('Powrót nie może ruszać przed dojazdem');
    }
  }
}
