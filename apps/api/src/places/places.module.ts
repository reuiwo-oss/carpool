import { Module } from '@nestjs/common';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';

@Module({
  controllers: [PlacesController],
  providers: [PlacesService],
  // Filtr wycieczek po miejscu pyta o potomków tym samym serwisem.
  exports: [PlacesService],
})
export class PlacesModule {}
