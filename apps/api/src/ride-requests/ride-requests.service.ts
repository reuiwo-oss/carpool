import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { RideRequest } from '@carpool/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRideRequestDto, UpdateRideRequestDto } from './ride-requests.dto';

@Injectable()
export class RideRequestsService {
  constructor(private prisma: PrismaService) {}

  /** Otwarte i wciąż aktualne prośby — najbliższe terminy u góry. */
  async list(): Promise<RideRequest[]> {
    const rows = await this.prisma.rideRequest.findMany({
      where: { status: 'OPEN', dateTo: { gte: new Date() } },
      orderBy: { dateFrom: 'asc' },
      include: { user: { select: { name: true } } },
    });

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: row.user.name,
      destination: row.destination,
      dateFrom: row.dateFrom.toISOString(),
      dateTo: row.dateTo.toISOString(),
      seatsNeeded: row.seatsNeeded,
      note: row.note,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  create(userId: string, dto: CreateRideRequestDto) {
    const dateFrom = new Date(dto.dateFrom);
    const dateTo = new Date(dto.dateTo);
    if (dateTo < dateFrom) {
      throw new BadRequestException('Koniec okna terminów nie może być przed początkiem');
    }

    return this.prisma.rideRequest.create({
      data: {
        userId,
        destination: dto.destination.trim(),
        dateFrom,
        dateTo,
        seatsNeeded: dto.seatsNeeded ?? 1,
        note: dto.note?.trim() || null,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateRideRequestDto) {
    await this.assertAuthor(userId, id);
    return this.prisma.rideRequest.update({ where: { id }, data: { status: dto.status } });
  }

  async remove(userId: string, id: string) {
    await this.assertAuthor(userId, id);
    await this.prisma.rideRequest.delete({ where: { id } });
    return { ok: true };
  }

  private async assertAuthor(userId: string, id: string) {
    const request = await this.prisma.rideRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Prośba nie istnieje');
    if (request.userId !== userId) {
      throw new ForbiddenException('Możesz zmieniać tylko własne prośby');
    }
    return request;
  }
}
