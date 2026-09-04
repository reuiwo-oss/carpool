import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { Role } from '@carpool/shared';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  name!: string;

  /**
   * Rola przestała być wyborem przy rejestracji — w modelu wycieczkowym
   * wylicza się z danych. Pole zostaje opcjonalne tylko do etapu 6, w którym
   * kolumna `User.role` znika razem z nim.
   */
  @IsOptional()
  @IsIn(['DRIVER', 'PASSENGER'])
  role?: Role;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
