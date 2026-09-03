import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RidesModule } from './rides/rides.module';
import { BookingsModule } from './bookings/bookings.module';
import { ConversationsModule } from './conversations/conversations.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { TripsModule } from './trips/trips.module';
import { TripRidesModule } from './trip-rides/trip-rides.module';
import { ReservationsModule } from './reservations/reservations.module';
import { RideRequestsModule } from './ride-requests/ride-requests.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    // — model przejazdowy, do usunięcia w etapie 6 —
    RidesModule,
    BookingsModule,
    ConversationsModule,
    // — model wycieczkowy —
    VehiclesModule,
    TripsModule,
    TripRidesModule,
    ReservationsModule,
    RideRequestsModule,
  ],
})
export class AppModule {}
