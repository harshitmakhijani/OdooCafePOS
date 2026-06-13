import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/AuthContext';
import { HAMBURGER_LINKS, linksForRole } from './nav';

/**
 * Role-filtered hamburger menu (PRD §9.1 / §12). Exposes the admin config links
 * the signed-in user is allowed to see, plus Log-Out.
 */
export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const { role, signOut } = useAuth();
  const links = linksForRole(HAMBURGER_LINKS, role);

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
        <Menu className="h-5 w-5" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="block rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                {link.label}
              </Link>
            ))}
            {links.length > 0 && <div className="my-1 h-px bg-border" />}
            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-destructive hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
