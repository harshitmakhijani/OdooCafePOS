import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@cafe-pos/types';

/**
 * Auth state (shape only — base prompt §6). Holds the current user + tokens and
 * exposes setters. `RoleGuard` and `api.ts` read from here.
 */
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hasActiveSession: boolean;
  setSession: (payload: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  }) => void;
  setAccessToken: (accessToken: string) => void;
  setHasActiveSession: (hasActiveSession: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasActiveSession: false,
      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setHasActiveSession: (hasActiveSession) => set({ hasActiveSession }),
      clear: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          hasActiveSession: false,
        }),
    }),
    { name: 'cafe-pos-auth' },
  ),
);
