import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
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
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim();

    // Pre-check for a friendly 409; the unique constraint + P2002 catch below
    // closes the TOCTOU race between this check and the create.
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      const field = existing.email === email ? 'email' : 'username';
      throw new ConflictException(`A user with this ${field} already exists`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email,
          username,
          passwordHash,
          role: 'CASHIER', // Default role per Decisions Log; admins create staff via /users
        },
      });
      return this.toAuthUser(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A user with this email or username already exists');
      }
      throw err;
    }
  }

  /* ──────────────────────── LOGIN (PRD §13.1, §21.1) ──────────────────────── */

  async login(dto: LoginDto): Promise<LoginResponse> {
    const identifier = dto.identifier.trim();

    // Find by email (case-insensitive) OR username, active only (PRD §21.1).
    const user = await this.prisma.user.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { username: identifier },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user.id, user.username, user.role);

    return {
      ...tokens,
      user: this.toAuthUser(user),
    };
  }

  /* ──────────────────────── REFRESH (PRD §13.1, §16.1) ──────────────────── */

  async refresh(
    userId: string,
    oldRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // The token's `jti` identifies the specific stored refresh token (per device).
    const decoded = this.jwt.decode(oldRefreshToken) as { jti?: string } | null;
    const jti = decoded?.jti;
    if (!jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: jti } });
    if (!stored || stored.userId !== userId) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Reuse of an already-rotated token is a theft signal → revoke every token
    // for this user. (Only on genuine reuse, NOT on an unrelated mismatch — so
    // concurrent multi-terminal use no longer triggers false logouts. PRD §7.4.)
    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const matches = await bcrypt.compare(oldRefreshToken, stored.tokenHash);
    if (!matches) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is inactive or no longer exists');
    }

    // Rotate: revoke the presented token, issue a fresh pair.
    await this.prisma.refreshToken.update({
      where: { id: jti },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user.id, user.username, user.role);
  }

  /* ──────────────────────── LOGOUT (PRD §13.1) ──────────────────────────── */

  async logout(userId: string): Promise<void> {
    // Revoke all active refresh tokens for the user (sign out everywhere).
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
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

  /**
   * Issue an access + refresh token pair. The refresh token carries a unique
   * `jti` and is persisted (hashed) as its own row, so it can be rotated and
   * revoked independently of any other device's token.
   */
  private async issueTokens(
    userId: string,
    username: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtAccessPayload = {
      sub: userId,
      username,
      role: role as JwtAccessPayload['role'],
    };
    const jti = randomUUID();

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessTtl') ?? '15m',
    });
    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti },
      {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshTtl') ?? '7d',
      },
    );

    const decoded = this.jwt.decode(refreshToken) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: { id: jti, userId, tokenHash, expiresAt },
    });

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
