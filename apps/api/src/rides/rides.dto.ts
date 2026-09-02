import { IsDateString, IsInt, IsString, Max, Min } from 'class-validator';

export class CreateRideDto {
  @IsString()
  carModel!: string;

  @IsInt()
  @Min(1)
  @Max(7)
  seatCount!: number;

  @IsString()
  origin!: string;

  @IsString()
  destination!: string;

  @IsDateString()
  departureAt!: string;
}
