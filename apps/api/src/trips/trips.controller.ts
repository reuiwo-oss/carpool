import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TripsService } from './trips.service';
import { CreateTripDto, UpdateTripDto } from './trips.dto';

/**
 * Bez `RolesGuard` — w modelu wycieczkowym rola nie jest cechą konta.
 * Wszystkie sprawdzenia robi `TripsService` przez `TripAccessService`.
 */
@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private trips: TripsService) {}

  /** Publiczne, nadchodzące wycieczki — dla każdego zalogowanego */
  @Get()
  list() {
    return this.trips.list();
  }

  /**
   * Moje wycieczki z wyliczonymi rolami.
   * Musi stać przed @Get(':id'), inaczej „mine" trafi w parametr id.
   */
  @Get('mine')
  mine(@Req() req: any) {
    return this.trips.mine(req.user.id);
  }

  /** Szczegóły: uczestnicy z rolami, auta z odcinkami i stanem miejsc */
  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.trips.getOne(id, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateTripDto) {
    return this.trips.create(req.user.id, dto);
  }

  @Post(':id/join')
  join(@Req() req: any, @Param('id') id: string) {
    return this.trips.join(id, req.user.id);
  }

  @Delete(':id/leave')
  leave(@Req() req: any, @Param('id') id: string) {
    return this.trips.leave(id, req.user.id);
  }

  /** Tylko organizator */
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTripDto) {
    return this.trips.update(id, req.user.id, dto);
  }
}
