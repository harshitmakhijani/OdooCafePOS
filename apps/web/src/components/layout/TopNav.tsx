import { NavLink as RouterNavLink } from 'react-router-dom';
import { Search, UserCircle2, Armchair, Coffee } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/auth/AuthContext';
import { useCartStore } from '@/stores/cart.store';
import { cn } from '@/lib/utils';
import { HamburgerMenu } from './HamburgerMenu';
import { POS_LINKS, linksForRole } from './nav';

/** POS top bar — Neubrutalism styled (PRD §9.1). */
export function TopNav() {
  const { user, role } = useAuth();
  const tableId = useCartStore((s) => s.tableId);
  const links = linksForRole(POS_LINKS, role);

  return (
    <header className="sticky top-0 z-30 border-b-[3px] border-cafe-text bg-cafe-surface">
      <div className="flex h-16 items-center gap-4 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-coral border-neo border-cafe-text shadow-neo-sm flex items-center justify-center">
            <Coffee className="h-5 w-5 text-coral-foreground" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-cafe-text hidden sm:block">
            Cafe POS
          </span>
        </div>

        {/* POS nav links */}
        <nav className="hidden items-center gap-1 md:flex ml-4">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <RouterNavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-100 border-neo',
                    isActive
                      ? 'bg-coral text-coral-foreground border-cafe-text shadow-none translate-x-[1px] translate-y-[1px]'
                      : 'border-transparent text-cafe-text-muted hover:text-cafe-text hover:bg-cafe-surface-2 hover:border-cafe-text',
                  )
                }
              >
                {Icon && <Icon className="h-4 w-4" />}
                {link.label}
              </RouterNavLink>
            );
          })}
        </nav>

        {/* Product search */}
        <div className="relative ml-auto hidden w-64 lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cafe-text-muted" />
          <Input placeholder="Search products…" className="pl-9 h-9 text-sm" />
        </div>

        {/* Right side — table indicator, user, hamburger */}
        <div className="flex items-center gap-2 ml-auto lg:ml-0">
          {/* Table indicator */}
          <span className="hidden items-center gap-1 rounded-lg border-neo border-cafe-text bg-cafe-surface-2 px-2.5 py-1 text-xs font-semibold text-cafe-text sm:flex">
            <Armchair className="h-3.5 w-3.5" />
            {tableId ? `Table ${tableId.slice(0, 6)}` : 'No table'}
          </span>

          {/* User */}
          <span className="flex items-center gap-1.5 text-sm font-semibold text-cafe-text-muted">
            <UserCircle2 className="h-5 w-5" />
            <span className="hidden sm:inline">{user?.name ?? 'Guest'}</span>
          </span>

          <HamburgerMenu />
        </div>
      </div>
    </header>
  );
}
