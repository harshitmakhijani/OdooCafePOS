import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/auth/AuthContext';
import { HAMBURGER_LINKS, linksForRole } from './nav';
import { cn } from '@/lib/utils';

/** Shared application shell for the POS and Admin route groups (base prompt §6). */
export function AppShell() {
  const { role } = useAuth();
  const location = useLocation();

  const sidebarLinks = linksForRole(HAMBURGER_LINKS, role);
  const isSessionPage = location.pathname === '/pos';
  const showNav = !isSessionPage;
  const hasSidebar = showNav && sidebarLinks.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {showNav && <TopNav />}
      <div className="flex flex-1">
        {hasSidebar && <Sidebar />}
        <main className={cn('flex-1 p-6 overflow-y-auto', !hasSidebar && 'mx-auto w-full max-w-7xl px-4 py-6')}>
          <div className={cn(hasSidebar && 'mx-auto w-full max-w-7xl')}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
