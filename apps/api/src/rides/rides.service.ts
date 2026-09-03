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

  /**
   * Przejazdy zalogowanego kierowcy — ekran „Moje przejazdy" pokazuje obsadę,
   * więc imiona pasażerów dołączamy tylko tutaj (to zawsze własne przejazdy).
   */
  listForDriver(driverId: string) {
    return this.prisma.ride.findMany({
      where: { driverId },
      include: {
        bookings: {
          select: { id: true, seatId: true, status: true, passenger: { select: { name: true } } },
        },
      },
      orderBy: { departureAt: 'asc' },
    });
  }

  /** Zwraca przejazd z układem miejsc zaktualizowanym o rezerwacje */
  async getWithSeats(id: string, viewerId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      include: {
        driver: { select: { name: true } },
        bookings: {
          select: {
            id: true,
            seatId: true,
            passengerId: true,
            status: true,
            passenger: { select: { name: true } },
          },
        },
      },
    });
    if (!ride) throw new NotFoundException('Przejazd nie istnieje');

    // Kto siedzi na którym miejscu widzi wyłącznie kierowca tego przejazdu —
    // pasażerowie dostają sam status „zajęte", bez imion.
    const isOwner = ride.driverId === viewerId;
    const bySeat = new Map(ride.bookings.map((b) => [b.seatId, b]));

    const seats = (ride.seatLayout as unknown as Seat[]).map((seat) => {
      if (seat.status === 'DRIVER') {
        return isOwner ? { ...seat, who: ride.driver.name } : seat;
      }
      const booking = bySeat.get(seat.id);
      if (!booking) return seat;

      // Oczekującą prośbę widzą tylko zainteresowani: pasażer, który poprosił,
      // i kierowca, który ma zdecydować. Dla reszty miejsce jest po prostu zajęte.
      const concerns = isOwner || booking.passengerId === viewerId;
      const status = booking.status === 'PENDING' && concerns ? 'PENDING' : 'TAKEN';

      return {
        ...seat,
        status: status as Seat['status'],
        ...(isOwner ? { who: booking.passenger.name } : {}),
      };
    });

    return {
      ...ride,
      seats,
      // Bez imion — pasażer musi rozpoznać własną prośbę (id do anulowania).
      bookings: ride.bookings.map((b) => ({
        id: b.id,
        seatId: b.seatId,
        passengerId: b.passengerId,
        status: b.status,
      })),
    };
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
