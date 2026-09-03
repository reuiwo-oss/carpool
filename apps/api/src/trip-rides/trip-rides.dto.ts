import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { LegDirection } from '@carpool/shared';

export const LEG_DIRECTIONS: LegDirection[] = ['OUTBOUND', 'RETURN'];

export class RideLegDto {
  @IsIn(LEG_DIRECTIONS)
  direction!: LegDirection;

  /** Miejsce zbiórki na tym odcinku — na powrót bywa inne niż na dojazd. */
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  origin!: string;

  @IsDateString()
  departureAt!: string;

  @IsOptional()
  @IsDateString()
  arrivalAt?: string;
}

export class CreateTripRideDto {
  @IsString()
  vehicleId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** Dojazd i powrót. Jeden odcinek to wyjazd w jedną stronę — też dozwolony. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => RideLegDto)
  legs!: RideLegDto[];
}

export class UpdateRideLegDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  origin?: string;

  @IsOptional()
  @IsDateString()
  departureAt?: string;

  @IsOptional()
  @IsDateString()
  arrivalAt?: string;
}
