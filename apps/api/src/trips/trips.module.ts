import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { TripAccessService } from './trip-access.service';

@Module({
  controllers: [TripsController],
  providers: [TripsService, TripAccessService],
  // Auta, rezerwacje i odcinki pytają o uprawnienia tym samym serwisem.
  exports: [TripAccessService],
})
export class TripsModule {}
