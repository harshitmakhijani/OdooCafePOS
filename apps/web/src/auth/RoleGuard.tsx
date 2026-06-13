import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Role } from '@cafe-pos/types';
import { useAuth } from './AuthContext';

/** Default landing route per role after login. */
// eslint-disable-next-line react-refresh/only-export-components
export function defaultRouteForRole(role: Role | null): string {
  switch (role) {
    case Role.KITCHEN:
      return '/kds';
    case Role.ADMIN:
    case Role.CASHIER:
      return '/pos';
    default:
      return '/login';
  }
}

interface RoleGuardProps {
  /** Roles permitted to view the wrapped routes. Omit to allow any authenticated user. */
  allow?: Role[];
}

/**
 * Route-group guard. Redirects unauthenticated users to /login and users whose
 * role is not permitted to their own default surface. Mirrors the server-side
 * role guards (PRD §3/§16.1) — the client gate is UX only; the API enforces.
 */
export function RoleGuard({ allow }: RoleGuardProps) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allow && (!role || !allow.includes(role))) {
    return <Navigate to={defaultRouteForRole(role)} replace />;
  }

  return <Outlet />;
}
