import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Konto z tym adresem e-mail już istnieje');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        // Kolumna jest jeszcze wymagana w bazie, ale nic już z niej nie wynika —
        // znika w etapie 6. Konta bez wskazanej roli dostają obojętną wartość.
        role: dto.role ?? 'PASSENGER',
        passwordHash: await bcrypt.hash(dto.password, 10),
      },
    });
    return this.issueToken(user.id, user.email, user.role, user.name);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Nieprawidłowy e-mail lub hasło');
    }
    return this.issueToken(user.id, user.email, user.role, user.name);
  }

  private issueToken(sub: string, email: string, role: string, name: string) {
    return {
      accessToken: this.jwt.sign({ sub, email, role }),
      user: { id: sub, email, role, name },
    };
  }
}
