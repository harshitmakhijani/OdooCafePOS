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
      secretOrKey: config.get<string>('jwt.refreshSecret') ?? 'dev-refresh-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtAccessPayload): Promise<RefreshPayload> {
    const refreshToken = (req.body as { refreshToken?: string })?.refreshToken;
    if (!payload?.sub || !refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    // TODO(PRD §16.1): verify the token against the stored/rotated refresh token.
    return { ...payload, refreshToken };
  }
}
