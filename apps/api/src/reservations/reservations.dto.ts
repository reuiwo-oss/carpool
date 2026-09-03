import { IsIn, IsOptional, IsString } from 'class-validator';
import type { ReservationLegs } from '@carpool/shared';

export const RESERVATION_LEGS: ReservationLegs[] = ['BOTH', 'OUTBOUND_ONLY', 'RETURN_ONLY'];

export class CreateReservationDto {
  @IsString()
  seatId!: string;

  /** Domyślnie oba odcinki — jedziemy tam i z powrotem tym samym składem. */
  @IsOptional()
  @IsIn(RESERVATION_LEGS)
  legs?: ReservationLegs;
}
