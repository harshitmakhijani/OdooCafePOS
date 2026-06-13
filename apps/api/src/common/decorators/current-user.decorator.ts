import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtAccessPayload } from '@cafe-pos/types';

/**
 * Injects the authenticated user (the validated JWT payload that the
 * JwtStrategy attached to `request.user`).
 *
 * Usage: `@CurrentUser() user: JwtAccessPayload` or `@CurrentUser('sub') id: string`.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtAccessPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtAccessPayload | undefined;
    return data && user ? user[data] : user;
  },
);
