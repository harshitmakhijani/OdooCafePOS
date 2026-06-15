import { NavLink } from 'react-router-dom';
import {
  LogOut,
  Package,
  Tags,
  CreditCard,
  Percent,
  Calendar,
  Users,
  Monitor,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { HAMBURGER_LINKS, linksForRole } from './nav';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'Products': Package,
  'Category': Tags,
  'Payment Method': CreditCard,
  'Coupon & Promotion': Percent,
  'Booking': Calendar,
  'User / Employee': Users,
  'KDS': Monitor,
  'Reports': BarChart3,
};

export function Sidebar() {
  const { role, signOut } = useAuth();
  const links = linksForRole(HAMBURGER_LINKS, role);

  if (links.length === 0) return null;

  return (
    <aside className="w-64 border-r-2 border-black bg-white p-4 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 z-20">
      <div className="space-y-4">
        <div className="px-2 text-xs font-black uppercase tracking-widest text-black/60">
          Admin Backend
        </div>
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = ICON_MAP[link.label];
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 text-sm font-bold border-2 border-transparent rounded-lg transition-all select-none',
                    isActive
                      ? 'bg-neubrutal-lime text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-x-[1px] -translate-y-[1px]'
                      : 'text-black hover:bg-neubrutal-lime/20 hover:border-black/10 hover:-translate-x-[0.5px] hover:-translate-y-[0.5px]',
                  )
                }
              >
                {Icon && <Icon className="h-4 w-4 shrink-0 text-black" />}
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <button
        onClick={() => signOut()}
        className="flex w-full items-center gap-3 px-3 py-2 text-sm font-bold text-black border-2 border-transparent rounded-lg hover:bg-red-500/20 hover:border-black transition-all select-none"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>Log out</span>
      </button>
    </aside>
  );
}
