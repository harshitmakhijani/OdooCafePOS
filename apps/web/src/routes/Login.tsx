import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { LoginResponse } from '@cafe-pos/types';
import { api } from '@/lib/api';
import { useAuth } from '@/auth/AuthContext';
import { defaultRouteForRole } from '@/auth/RoleGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Coffee } from 'lucide-react';

/** Login screen — Neubrutalism styled (PRD §8.1). */
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
          ?.message ?? 'Invalid credentials. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-xl bg-coral border-[3px] border-cafe-text shadow-neo flex items-center justify-center">
            <Coffee className="h-8 w-8 text-coral-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-cafe-text tracking-tight">Cafe POS</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your email or username to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or username</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  placeholder="cashier@cafe.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && (
                <div className="rounded-lg border-[1.5px] border-cancelled bg-cancelled-bg px-3 py-2 text-sm font-semibold text-cancelled">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
              <p className="text-center text-sm text-cafe-text-muted font-medium">
                No account?{' '}
                <Link to="/signup" className="text-coral font-bold hover:underline underline-offset-2">
                  Sign up
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
