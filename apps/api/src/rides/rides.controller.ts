import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RidesService } from './rides.service';
import { CreateRideDto } from './rides.dto';

@Controller('rides')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RidesController {
  constructor(private rides: RidesService) {}

  /** Lista nadchodzących przejazdów — widoczna dla wszystkich zalogowanych */
  @Get()
  list() {
    return this.rides.list();
  }

  /** Szczegóły przejazdu z aktualnym stanem miejsc */
  @Get(':id')
  get(@Param('id') id: string) {
    return this.rides.getWithSeats(id);
  }

  /** Tylko kierowca tworzy ofertę przejazdu */
  @Post()
  @Roles('DRIVER')
  create(@Req() req: any, @Body() dto: CreateRideDto) {
    return this.rides.create(req.user.id, dto);
  }

  /** Tylko kierowca-właściciel może usunąć swoją ofertę */
  @Delete(':id')
  @Roles('DRIVER')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.rides.remove(req.user.id, id);
  }
}
