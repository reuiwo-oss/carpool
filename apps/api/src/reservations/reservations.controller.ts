import { Body, Controller, Delete, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './reservations.dto';

/**
 * Rezerwacja powstaje w kontekście auta w wycieczce, ale żyje własnym id —
 * anulowanie i potwierdzanie nie potrzebują już całej ścieżki.
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private reservations: ReservationsService) {}

  @Post('trips/:tripId/rides/:rideId/reservations')
  create(
    @Req() req: any,
    @Param('tripId') tripId: string,
    @Param('rideId') rideId: string,
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservations.create(req.user.id, tripId, rideId, dto);
  }

  /** Kierowca tego auta potwierdza prośbę */
  @Post('reservations/:id/accept')
  accept(@Req() req: any, @Param('id') id: string) {
    return this.reservations.accept(req.user.id, id);
  }

  /** Rezygnacja pasażera albo odmowa kierowcy — jedno i to samo */
  @Delete('reservations/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.reservations.remove(req.user.id, id);
  }
}
