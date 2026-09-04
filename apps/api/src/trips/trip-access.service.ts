import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Uprawnienia w modelu wycieczkowym nie wynikają z roli na koncie, tylko
 * z kontekstu wycieczki. Dlatego nie ma tu `@Roles()` ani `RolesGuard` —
 * każdy moduł pyta wprost, czy wolno.
 */
@Injectable()
export class TripAccessService {
  constructor(private prisma: PrismaService) {}

  /** Uczestnik wycieczki — podstawa każdej akcji wewnątrz wycieczki. */
  async assertParticipant(tripId: string, userId: string) {
    const participant = await this.prisma.tripParticipant.findUnique({
      where: { tripId_userId: { tripId, userId } },
    });
    if (participant) return participant;

    // Rozróżniamy „nie ma takiej wycieczki" od „nie twoja wycieczka" —
    // inaczej literówka w id wygląda jak brak uprawnień.
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, select: { id: true } });
    if (!trip) throw new NotFoundException('Wycieczka nie istnieje');
    throw new ForbiddenException('Nie jesteś uczestnikiem tej wycieczki');
  }

  async assertOrganizer(tripId: string, userId: string) {
    const participant = await this.assertParticipant(tripId, userId);
    if (!participant.isOrganizer) {
      throw new ForbiddenException('To może zrobić tylko organizator wycieczki');
    }
    return participant;
  }

  async assertRideDriver(rideId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('To auto nie istnieje');
    if (ride.driverId !== userId) throw new ForbiddenException('To nie jest twoje auto');
    return ride;
  }
}
