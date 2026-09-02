import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { generateSeatLayout, Seat } from '@carpool/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRideDto } from './rides.dto';

@Injectable()
export class RidesService {
  constructor(private prisma: PrismaService) {}

  create(driverId: string, dto: CreateRideDto) {
    return this.prisma.ride.create({
      data: {
        driverId,
        carModel: dto.carModel,
        seatCount: dto.seatCount,
        origin: dto.origin,
        destination: dto.destination,
        departureAt: new Date(dto.departureAt),
        seatLayout: generateSeatLayout(dto.seatCount) as unknown as object,
      },
    });
  }

  list() {
    return this.prisma.ride.findMany({
      where: { departureAt: { gte: new Date() } },
      include: {
        driver: { select: { name: true } },
        bookings: { select: { seatId: true } },
      },
      orderBy: { departureAt: 'asc' },
    });
  }

  /** Zwraca przejazd z układem miejsc zaktualizowanym o rezerwacje */
  async getWithSeats(id: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      include: {
        driver: { select: { name: true } },
        bookings: { select: { seatId: true, passengerId: true } },
      },
    });
    if (!ride) throw new NotFoundException('Przejazd nie istnieje');

    const taken = new Set(ride.bookings.map((b) => b.seatId));
    const seats = (ride.seatLayout as unknown as Seat[]).map((s) =>
      taken.has(s.id) ? { ...s, status: 'TAKEN' as const } : s,
    );
    return { ...ride, seats };
  }

  async remove(driverId: string, id: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id } });
    if (!ride) throw new NotFoundException('Przejazd nie istnieje');
    if (ride.driverId !== driverId) {
      throw new ForbiddenException('Możesz usuwać tylko własne przejazdy');
    }
    await this.prisma.booking.deleteMany({ where: { rideId: id } });
    return this.prisma.ride.delete({ where: { id } });
  }
}
