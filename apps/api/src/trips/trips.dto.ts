import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { TripStatus, TripVisibility } from '@carpool/shared';

export const TRIP_VISIBILITIES: TripVisibility[] = ['PUBLIC', 'LINK_ONLY', 'PRIVATE'];
export const TRIP_STATUSES: TripStatus[] = ['OPEN', 'CONFIRMED', 'DONE', 'CANCELLED'];

export class CreateTripDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  destination!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /**
   * Ramy czasowe z formularza. Po dodaniu pierwszego auta przelicza je
   * `recomputeTripSchedule` z odcinków — te wartości są punktem wyjścia.
   */

  /**
   * Cel wybrany z bazy miejsc. Puste, gdy użytkownik wpisał własną nazwę —
   * wtedy zostaje samo `destination`.
   */
  @IsOptional()
  @IsString()
  destinationPlaceId?: string;

  /** Baza / dojazd: nazwa do wyświetlenia i, opcjonalnie, miejsce z bazy. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  baseName?: string;

  @IsOptional()
  @IsString()
  basePlaceId?: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsIn(TRIP_VISIBILITIES)
  visibility?: TripVisibility;
}

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  destination?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;


  /**
   * Cel wybrany z bazy miejsc. Puste, gdy użytkownik wpisał własną nazwę —
   * wtedy zostaje samo `destination`.
   */
  @IsOptional()
  @IsString()
  destinationPlaceId?: string;

  /** Baza / dojazd: nazwa do wyświetlenia i, opcjonalnie, miejsce z bazy. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  baseName?: string;

  @IsOptional()
  @IsString()
  basePlaceId?: string;
  @IsOptional()
  @IsIn(TRIP_VISIBILITIES)
  visibility?: TripVisibility;

  @IsOptional()
  @IsIn(TRIP_STATUSES)
  status?: TripStatus;
}
