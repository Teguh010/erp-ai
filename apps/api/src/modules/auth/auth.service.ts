import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto';
import { JwtPayload, UserWithRole } from '../../common/interfaces';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterDto) {
    const { email, password, fullName, roleName } = data;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Use interactive transaction for atomicity
    const user = await this.prisma.$transaction(async (tx) => {
      // Find or create role within transaction
      let role = await tx.role.findUnique({
        where: { name: roleName || 'USER' },
      });

      if (!role) {
        role = await tx.role.create({
          data: { name: roleName || 'USER' },
        });
      }

      return tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          fullName,
          roleId: role.id,
        },
      });
    });

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !(await bcrypt.compare(pass, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const payload = { email: user.email, sub: user.id, role: user.role.name };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.name,
      },
    };
  }

  async validateUser(payload: JwtPayload): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });
  }
}
