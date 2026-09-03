import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BookingsService } from './bookings.service';

class CreateBookingDto {
  @IsString()
  rideId!: string;

  @IsString()
  seatId!: string;

  /** Pytania lub uwagi do kierowcy — trafiają jako pierwsza wiadomość w wątku. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private bookings: BookingsService) {}

  /** Pasażer prosi o konkretne miejsce wybrane na schemacie auta */
  @Post()
  @Roles('PASSENGER')
  create(@Req() req: any, @Body() dto: CreateBookingDto) {
    return this.bookings.request(req.user.id, dto.rideId, dto.seatId, dto.note ?? '');
  }

  /** Moje rezerwacje i prośby */
  @Get('my')
  @Roles('PASSENGER')
  my(@Req() req: any) {
    return this.bookings.forPassenger(req.user.id);
  }

  /** Kierowca potwierdza prośbę */
  @Post(':id/accept')
  @Roles('DRIVER')
  accept(@Req() req: any, @Param('id') id: string) {
    return this.bookings.accept(req.user.id, id);
  }

  /** Kierowca odrzuca prośbę — miejsce wraca do puli */
  @Post(':id/reject')
  @Roles('DRIVER')
  reject(@Req() req: any, @Param('id') id: string) {
    return this.bookings.reject(req.user.id, id);
  }

  /** Anulowanie własnej prośby lub rezerwacji */
  @Delete(':id')
  @Roles('PASSENGER')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.bookings.cancel(req.user.id, id);
  }
}
