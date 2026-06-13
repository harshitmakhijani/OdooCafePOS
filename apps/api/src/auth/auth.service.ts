import { Injectable, NotImplementedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { AuthUser, LoginResponse } from '@cafe-pos/types';
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

  async signup(_dto: SignupDto): Promise<AuthUser> {
    // TODO(PRD §13.1 / §8.1): hash password (bcryptjs), enforce unique email+username,
    // create the user, return the public profile.
    throw new NotImplementedException('auth.signup not implemented');
  }

  async login(_dto: LoginDto): Promise<LoginResponse> {
    // TODO(PRD §13.1 / §21.1): look up by email OR username, verify password hash,
    // issue access (~15m) + refresh (~7d) tokens, return { user, tokens }.
    throw new NotImplementedException('auth.login not implemented');
  }

  async refresh(_userId: string): Promise<{ accessToken: string }> {
    // TODO(PRD §13.1 / §16.1): validate + rotate refresh token, issue new access token.
    throw new NotImplementedException('auth.refresh not implemented');
  }

  async logout(_userId: string): Promise<void> {
    // TODO(PRD §13.1): invalidate the stored refresh token.
    throw new NotImplementedException('auth.logout not implemented');
  }

  async me(_userId: string): Promise<AuthUser> {
    // TODO(PRD §13.1): load and return the current user's public profile.
    throw new NotImplementedException('auth.me not implemented');
  }
}
