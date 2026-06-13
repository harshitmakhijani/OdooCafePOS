import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { LoginResponse } from '@cafe-pos/types';
import { api } from '@/lib/api';
import { useAuth } from '@/auth/AuthContext';
import { defaultRouteForRole } from '@/auth/RoleGuard';

/** Login screen (PRD §8.1) — identifier (email OR username) + password. */
export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { identifier, password });
      const payload: LoginResponse = res.data?.data ?? res.data;
      signIn(payload);
      navigate(defaultRouteForRole(payload.user.role), { replace: true });
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Invalid email/username or password.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neubrutal-cream p-4">
      <div className="w-full max-w-sm nb-card p-6 bg-white">
        <div className="mb-6 text-center">
          <div className="inline-block nb-badge bg-neubrutal-lime text-black mb-2 px-3 py-1 text-xs tracking-widest uppercase -rotate-2">
            POS SYSTEM
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-black mt-2">
            CAFE <span className="text-neubrutal-coral">POS</span>
          </h1>
          <p className="text-xs text-neutral-600 mt-1 font-medium">
            Sign in to start your shift session.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="identifier" className="text-xs font-bold uppercase tracking-wider text-black block">
              Username or Email
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
              className="w-full nb-input"
              placeholder="e.g. admin"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-black block">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full nb-input"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 border-2 border-black bg-red-100 rounded-lg text-xs font-bold text-red-700 shadow-neubrutal-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full nb-button-primary py-3 text-sm font-black uppercase tracking-wider"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In ➔'}
          </button>

          <div className="pt-2 text-center text-xs font-bold text-neutral-600">
            No account?{' '}
            <Link to="/signup" className="text-neubrutal-coral hover:underline">
              Create Account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
