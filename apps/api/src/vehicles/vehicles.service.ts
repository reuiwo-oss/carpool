import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { seatLayoutFor } from '@carpool/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './vehicles.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  /** Garaż zalogowanego użytkownika. */
  list(ownerId: string) {
    return this.prisma.vehicle.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(ownerId: string, dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: {
        ownerId,
        make: dto.make.trim(),
        model: dto.model.trim(),
        interior: dto.interior,
        // Ten sam generator co na froncie — podgląd i zapis nie mogą się rozjechać.
        seatLayout: seatLayoutFor(dto.interior) as unknown as object,
      },
    });
  }

  async remove(ownerId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('Pojazd nie istnieje');
    if (vehicle.ownerId !== ownerId) {
      throw new ForbiddenException('Możesz usuwać tylko własne auta');
    }

    const planned = await this.prisma.ride.count({
      where: { vehicleId: id, trip: { status: { in: ['OPEN', 'CONFIRMED'] } } },
    });
    if (planned > 0) {
      throw new ConflictException(
        'To auto jedzie w zaplanowanej wycieczce — najpierw wypisz je z wycieczki',
      );
    }

    // Auto z odbytych wycieczek trzyma je za snapshot miejsc — usunięcie
    // zabrałoby historię komuś, kto nim jechał. Mówimy to wprost zamiast
    // wywracać się na kluczu obcym.
    const historic = await this.prisma.ride.count({ where: { vehicleId: id } });
    if (historic > 0) {
      throw new ConflictException('To auto jest w historii wycieczek i zostaje w archiwum');
    }

    await this.prisma.vehicle.delete({ where: { id } });
    return { ok: true };
  }
}
