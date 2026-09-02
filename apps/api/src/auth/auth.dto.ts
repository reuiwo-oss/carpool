import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import type { Role } from '@carpool/shared';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  name!: string;

  @IsIn(['DRIVER', 'PASSENGER'])
  role!: Role;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
