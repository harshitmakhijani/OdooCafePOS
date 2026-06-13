import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { JwtAccessPayload } from '@cafe-pos/types';

interface RefreshPayload extends JwtAccessPayload {
  refreshToken?: string;
}

/**
 * Refresh-token strategy ('jwt-refresh'). Reads the refresh token from the JSON
 * body (`refreshToken`) and verifies it against the refresh secret. Used by the
 * `/auth/refresh` route.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      // No insecure fallback — fail fast if the secret is not configured.
      secretOrKey: config.getOrThrow<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtAccessPayload): Promise<RefreshPayload> {
    const refreshToken = (req.body as { refreshToken?: string })?.refreshToken;
    if (!payload?.sub || !refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    // The token is matched against the stored (hashed) per-device refresh token
    // and rotated in AuthService.refresh().
    return { ...payload, refreshToken };
  }
}
