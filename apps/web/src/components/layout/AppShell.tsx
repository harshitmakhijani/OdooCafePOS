import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';

/** Shared application shell for the POS and Admin route groups (base prompt §6). */
export function AppShell() {
  return (
    <div className="min-h-screen bg-muted/20">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
