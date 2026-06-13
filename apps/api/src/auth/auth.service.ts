import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { AuthUser, LoginResponse, JwtAccessPayload } from '@cafe-pos/types';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /* ──────────────────────── SIGNUP (PRD §8.1, §13.1) ──────────────────────── */

  async signup(dto: SignupDto): Promise<AuthUser> {
    // Check for duplicate email or username (409)
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });
    if (existing) {
      const field = existing.email === dto.email ? 'email' : 'username';
      throw new ConflictException(`A user with this ${field} already exists`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        username: dto.username,
        passwordHash,
        role: 'CASHIER', // Default role per Decisions Log; admins create staff via /users
      },
    });

    return this.toAuthUser(user);
  }

  /* ──────────────────────── LOGIN (PRD §13.1, §21.1) ──────────────────────── */

  async login(dto: LoginDto): Promise<LoginResponse> {
    // Find by email OR username (PRD §21.1)
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { username: dto.identifier }],
        status: 'ACTIVE',
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.username, user.role);

    // Store hashed refresh token for rotation (PRD §16.1)
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      ...tokens,
      user: this.toAuthUser(user),
    };
  }

  /* ──────────────────────── REFRESH (PRD §13.1, §16.1) ──────────────────── */

  async refresh(userId: string, oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Verify the presented refresh token matches the stored hash
    const isValid = await bcrypt.compare(oldRefreshToken, user.refreshTokenHash);
    if (!isValid) {
      // Possible token reuse — revoke all refresh tokens for safety
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Rotate: issue new tokens + store new hash
    const tokens = await this.generateTokens(user.id, user.username, user.role);
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });

    return tokens;
  }

  /* ──────────────────────── LOGOUT (PRD §13.1) ──────────────────────────── */

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  /* ──────────────────────── ME (PRD §13.1) ────────────────────────────────── */

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.toAuthUser(user);
  }

  /* ──────────────────────── HELPERS ──────────────────────────────────────── */

  private async generateTokens(
    userId: string,
    username: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtAccessPayload = {
      sub: userId,
      username,
      role: role as JwtAccessPayload['role'],
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessTtl') ?? '15m',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshTtl') ?? '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private toAuthUser(user: {
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
    status: string;
  }): AuthUser {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role as AuthUser['role'],
      status: user.status as AuthUser['status'],
    };
  }
}
