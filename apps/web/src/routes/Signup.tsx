import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

/** Signup screen (PRD §8.1) — Name, Email, Username, Password. */
export function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/signup', { name, email, username, password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Failed to register account. Check connection.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neubrutal-cream p-4">
      <div className="w-full max-w-sm nb-card p-6 bg-white">
        <div className="mb-6 text-center">
          <div className="inline-block nb-badge bg-neubrutal-lavender text-black mb-2 px-3 py-1 text-xs tracking-widest uppercase rotate-1">
            EMPLOYEE REGISTRATION
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-black mt-2">
            JOIN <span className="text-neubrutal-coral">US</span>
          </h1>
          <p className="text-xs text-neutral-600 mt-1 font-medium">
            Register a new cashier/employee account.
          </p>
        </div>

        {success ? (
          <div className="p-4 border-2 border-black bg-green-100 rounded-lg text-center font-bold text-green-700 shadow-neubrutal-sm space-y-2">
            <p>🎉 Registration Successful!</p>
            <p className="text-xs text-neutral-600 font-medium">Redirecting you to Login page...</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-black block">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full nb-input"
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-black block">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full nb-input"
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-black block">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full nb-input"
                placeholder="johndoe"
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
              {loading ? 'Registering...' : 'Register ➔'}
            </button>

            <div className="pt-2 text-center text-xs font-bold text-neutral-600">
              Already have an account?{' '}
              <Link to="/login" className="text-neubrutal-coral hover:underline">
                Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
