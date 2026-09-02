import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BookingsService } from './bookings.service';

class CreateBookingDto {
  @IsString()
  rideId!: string;

  @IsString()
  seatId!: string;
}

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private bookings: BookingsService) {}

  /** Pasażer rezerwuje konkretne miejsce wybrane na schemacie auta */
  @Post()
  @Roles('PASSENGER')
  create(@Req() req: any, @Body() dto: CreateBookingDto) {
    return this.bookings.create(req.user.id, dto.rideId, dto.seatId);
  }

  /** Moje rezerwacje */
  @Get('my')
  @Roles('PASSENGER')
  my(@Req() req: any) {
    return this.bookings.forPassenger(req.user.id);
  }

  /** Anulowanie własnej rezerwacji */
  @Delete(':id')
  @Roles('PASSENGER')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.bookings.cancel(req.user.id, id);
  }
}
