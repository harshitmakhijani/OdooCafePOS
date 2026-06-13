import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AuthUser, LoginResponse, Role } from '@cafe-pos/types';
import { useAuthStore } from '@/stores/auth.store';
import { disconnectSocket } from '@/lib/socket';

interface AuthContextValue {
  user: AuthUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  /** Persist a successful login response into the auth store. */
  signIn: (payload: LoginResponse) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated,
      signIn: ({ user: u, accessToken, refreshToken }) =>
        setSession({ user: u, accessToken, refreshToken }),
      signOut: () => {
        clear();
        disconnectSocket();
      },
    }),
    [user, isAuthenticated, setSession, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
