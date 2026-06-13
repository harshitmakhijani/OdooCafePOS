import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtAccessPayload } from '@cafe-pos/types';

/**
 * Access-token strategy. Passport verifies the signature + expiry; `validate`
 * receives the decoded payload and attaches it to `request.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret') ?? 'dev-access-secret',
    });
  }

  async validate(payload: JwtAccessPayload): Promise<JwtAccessPayload> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid access token');
    }
    // TODO(PRD §16.1): optionally load the user and reject if status=ARCHIVED.
    return { sub: payload.sub, username: payload.username, role: payload.role };
  }
}
