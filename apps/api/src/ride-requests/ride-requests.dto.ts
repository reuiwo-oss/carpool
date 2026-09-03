import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { RequestStatus } from '@carpool/shared';

export class CreateRideRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  destination!: string;

  @IsDateString()
  dateFrom!: string;

  @IsDateString()
  dateTo!: string;

  /** Ile miejsc — ktoś jedzie z osobą towarzyszącą. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  seatsNeeded?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateRideRequestDto {
  /**
   * Jedyna sensowna zmiana: „już mam czym jechać". `EXPIRED` ustawia się samo
   * przez `dateTo`, więc autor go nie podaje.
   */
  @IsIn(['FULFILLED'] as RequestStatus[])
  status!: RequestStatus;
}
