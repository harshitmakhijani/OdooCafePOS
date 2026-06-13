import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtAccessPayload } from '@cafe-pos/types';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Access-token strategy. Passport verifies the signature + expiry; `validate`
 * then loads the user to enforce live status (an archived/removed user is
 * rejected even with an otherwise-valid token — PRD §8.7, §16.1).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // No insecure fallback — fail fast if the secret is not configured.
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<JwtAccessPayload> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid access token');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, role: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is inactive or no longer exists');
    }
    return { sub: user.id, username: user.username, role: user.role as JwtAccessPayload['role'] };
  }
}
