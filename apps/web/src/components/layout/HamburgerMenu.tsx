import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/AuthContext';
import { HAMBURGER_LINKS, linksForRole } from './nav';

/**
 * Role-filtered hamburger menu — Neubrutalism styled (PRD §9.1 / §12).
 * Exposes admin config links + Log-Out.
 */
export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const { role, signOut } = useAuth();
  const links = linksForRole(HAMBURGER_LINKS, role);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border-[3px] border-cafe-text bg-cafe-surface shadow-neo p-1.5">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-semibold text-cafe-text hover:bg-coral-soft transition-colors"
                >
                  {Icon && <Icon className="h-4 w-4 text-cafe-text-muted" />}
                  {link.label}
                </Link>
              );
            })}
            {links.length > 0 && <div className="my-1.5 h-[2px] bg-cafe-border rounded-full" />}
            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-cancelled hover:bg-cancelled-bg transition-colors"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
