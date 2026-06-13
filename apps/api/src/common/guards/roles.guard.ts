import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, type JwtAccessPayload } from '@cafe-pos/types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Role-based access control (PRD §3). The `@Roles(...)` value is the minimum
 * required role; ADMIN implicitly satisfies any CASHIER-gated route ("Admin can
 * do everything a Cashier can"). KITCHEN is restricted to KDS routes only.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() => any authenticated user may access.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtAccessPayload | undefined;

    if (!user) {
      throw new ForbiddenException('Missing authenticated user');
    }

    if (!this.hasRole(user.role, requiredRoles)) {
      throw new ForbiddenException('Insufficient role for this resource');
    }
    return true;
  }

  /** ADMIN supersedes CASHIER; otherwise an exact role match is required. */
  private hasRole(userRole: Role, requiredRoles: Role[]): boolean {
    if (requiredRoles.includes(userRole)) {
      return true;
    }
    // Admin can do everything a Cashier can (PRD §3).
    if (userRole === Role.ADMIN && requiredRoles.includes(Role.CASHIER)) {
      return true;
    }
    return false;
  }
}
