import { NavLink as RouterNavLink } from 'react-router-dom';
import { Search, UserCircle2, Armchair, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/AuthContext';
import { useCartStore } from '@/stores/cart.store';
import { cn } from '@/lib/utils';
import { POS_LINKS, HAMBURGER_LINKS, linksForRole } from './nav';

/** POS top bar (PRD §9.1): primary links, product search, current-table indicator, employee icon, hamburger. */
export function TopNav() {
  const { user, role, signOut } = useAuth();
  const tableId = useCartStore((s) => s.tableId);
  const links = linksForRole(POS_LINKS, role);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4">
        <span className="text-lg font-bold tracking-tight text-primary uppercase">Ivory</span>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <RouterNavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-bold border-2 border-transparent transition-all select-none',
                  isActive
                    ? 'bg-neubrutal-lime text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-x-[1px] -translate-y-[1px]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-neubrutal-lime/20 hover:border-black/10 hover:-translate-x-[0.5px] hover:-translate-y-[0.5px]',
                )
              }
            >
              {link.label}
            </RouterNavLink>
          ))}
        </nav>

        <div className="relative ml-auto hidden w-64 lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Product search…" className="!pl-9" />
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground sm:flex">
            <Armchair className="h-4 w-4" />
            {tableId ? `Table ${tableId.slice(0, 6)}` : 'No table'}
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground mr-1">
            <UserCircle2 className="h-5 w-5" />
            <span className="hidden sm:inline">{user?.name ?? 'Guest'}</span>
          </span>
          {linksForRole(HAMBURGER_LINKS, role).length === 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="flex items-center gap-1.5 font-bold text-destructive hover:bg-destructive/10 border-2 border-transparent hover:border-destructive transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
