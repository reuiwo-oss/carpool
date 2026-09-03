import { Module } from '@nestjs/common';
import { RideRequestsController } from './ride-requests.controller';
import { RideRequestsService } from './ride-requests.service';

@Module({
  controllers: [RideRequestsController],
  providers: [RideRequestsService],
})
export class RideRequestsModule {}
