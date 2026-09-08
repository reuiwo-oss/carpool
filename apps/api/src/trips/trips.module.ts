import { Module } from '@nestjs/common';
import { PlacesModule } from '../places/places.module';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { TripAccessService } from './trip-access.service';

@Module({
  // Filtrowanie wycieczek po miejscu potrzebuje hierarchii miejsc.
  imports: [PlacesModule],
  controllers: [TripsController],
  providers: [TripsService, TripAccessService],
  // Auta, rezerwacje i odcinki pytają o uprawnienia tym samym serwisem.
  exports: [TripAccessService],
})
export class TripsModule {}
