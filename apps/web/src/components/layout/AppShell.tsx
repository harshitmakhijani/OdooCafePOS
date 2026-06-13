import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';

/** Shared application shell for POS and Admin route groups — Neubrutalism styled. */
export function AppShell() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
