import { SetMetadata } from '@nestjs/common';
import { Role } from '@cafe-pos/types';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the listed roles (enforced server-side by RolesGuard).
 * The role listed is the *minimum* required per PRD §13 (Admin can do anything
 * a Cashier can — see RolesGuard for the implied hierarchy).
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
