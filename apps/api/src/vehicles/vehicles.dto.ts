import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { SHIPPED_INTERIORS } from '@carpool/shared';

export class CreateVehicleDto {
  /** Marka bywa pusta — skrypt migracji starych przejazdów nie ma skąd jej wziąć. */
  @IsString()
  @MaxLength(60)
  make!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  model!: string;

  /**
   * Wnętrze zamiast liczby miejsc: układ foteli i kształt schematu wynikają
   * z niego, a nie z formularza. Przyjmujemy tylko warianty wdrożone w tej fazie.
   */
  @IsIn(SHIPPED_INTERIORS)
  interior!: string;
}
