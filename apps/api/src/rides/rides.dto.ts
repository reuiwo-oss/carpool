import { IsDateString, IsIn, IsString } from 'class-validator';
import { SHIPPED_INTERIORS } from '@carpool/shared';

export class CreateRideDto {
  @IsString()
  carModel!: string;

  /**
   * Wnętrze auta decyduje o liczbie miejsc — kierowca nie podaje jej wprost.
   * Przyjmujemy tylko warianty wdrożone w tej fazie.
   */
  @IsIn(SHIPPED_INTERIORS)
  interior!: string;

  @IsString()
  origin!: string;

  @IsString()
  destination!: string;

  @IsDateString()
  departureAt!: string;
}
