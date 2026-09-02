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

  async create(passengerId: string, rideId: string, seatId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Przejazd nie istnieje');

    const layout = ride.seatLayout as unknown as Seat[];
    const seat = layout.find((s) => s.id === seatId);
    if (!seat || seat.status === 'DRIVER') {
      throw new BadRequestException('Nieprawidłowe miejsce');
    }

    try {
      // Unikalne indeksy w bazie (@@unique) gwarantują brak podwójnych
      // rezerwacji nawet przy równoczesnych żądaniach.
      return await this.prisma.booking.create({
        data: { rideId, seatId, passengerId },
      });
    } catch {
      throw new ConflictException(
        'To miejsce jest już zajęte albo masz już rezerwację w tym przejeździe',
      );
    }
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
            bookings: { select: { seatId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(passengerId: string, id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Rezerwacja nie istnieje');
    if (booking.passengerId !== passengerId) {
      throw new ForbiddenException('Możesz anulować tylko własne rezerwacje');
    }
    return this.prisma.booking.delete({ where: { id } });
  }
}
