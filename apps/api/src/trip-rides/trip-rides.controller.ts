import { Body, Controller, Delete, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TripRidesService } from './trip-rides.service';
import { CreateTripRideDto, UpdateRideLegDto } from './trip-rides.dto';

/** Auto zgłoszone do wycieczki — zawsze w kontekście konkretnej wycieczki. */
@Controller('trips/:tripId/rides')
@UseGuards(JwtAuthGuard)
export class TripRidesController {
  constructor(private rides: TripRidesService) {}

  /** Każdy uczestnik może dodać swoje auto — bez zgody organizatora */
  @Post()
  create(@Req() req: any, @Param('tripId') tripId: string, @Body() dto: CreateTripRideDto) {
    return this.rides.create(req.user.id, tripId, dto);
  }

  /** Godzina i miejsce zbiórki na danym odcinku — tylko kierowca tego auta */
  @Patch(':rideId/legs/:direction')
  updateLeg(
    @Req() req: any,
    @Param('tripId') tripId: string,
    @Param('rideId') rideId: string,
    @Param('direction') direction: string,
    @Body() dto: UpdateRideLegDto,
  ) {
    return this.rides.updateLeg(req.user.id, tripId, rideId, direction, dto);
  }

  /** Kierowca tego auta albo organizator */
  @Delete(':rideId')
  remove(@Req() req: any, @Param('tripId') tripId: string, @Param('rideId') rideId: string) {
    return this.rides.remove(req.user.id, tripId, rideId);
  }
}
