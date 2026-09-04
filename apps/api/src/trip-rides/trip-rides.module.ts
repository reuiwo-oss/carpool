import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module';
import { TripRidesController } from './trip-rides.controller';
import { TripRidesService } from './trip-rides.service';

@Module({
  imports: [TripsModule],
  controllers: [TripRidesController],
  providers: [TripRidesService],
})
export class TripRidesModule {}
