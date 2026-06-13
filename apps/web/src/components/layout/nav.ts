import { Role } from '@cafe-pos/types';
import {
  ShoppingCart,
  ClipboardList,
  Users,
  LayoutGrid,
  Package,
  Tag,
  CreditCard,
  Percent,
  CalendarDays,
  UserCog,
  BarChart3,
  ChefHat,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavLink {
  to: string;
  label: string;
  icon?: LucideIcon;
  allow?: Role[];
}

/* ── POS top-nav links (PRD §9.1) ── */
export const POS_LINKS: NavLink[] = [
  { to: '/pos/order', label: 'Order', icon: ShoppingCart },
  { to: '/pos/orders', label: 'Orders', icon: ClipboardList },
  { to: '/pos/customers', label: 'Customers', icon: Users },
  { to: '/pos/tables', label: 'Tables', icon: LayoutGrid },
];

/* ── Hamburger / sidebar links — role-filtered (PRD §9.1, §12) ── */
export const HAMBURGER_LINKS: NavLink[] = [
  { to: '/admin/products', label: 'Products', icon: Package, allow: [Role.ADMIN] },
  { to: '/admin/categories', label: 'Categories', icon: Tag, allow: [Role.ADMIN] },
  { to: '/admin/payment-methods', label: 'Payment methods', icon: CreditCard, allow: [Role.ADMIN] },
  { to: '/admin/promotions', label: 'Coupons & Promotions', icon: Percent, allow: [Role.ADMIN] },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays, allow: [Role.ADMIN] },
  { to: '/admin/users', label: 'Users', icon: UserCog, allow: [Role.ADMIN] },
  { to: '/admin/floors-tables', label: 'Floors & Tables', icon: LayoutGrid, allow: [Role.ADMIN] },
  { to: '/kds', label: 'Kitchen display', icon: ChefHat, allow: [Role.ADMIN, Role.KITCHEN] },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3, allow: [Role.ADMIN] },
];

/** Filter links by the signed-in user's role. */
export function linksForRole(links: NavLink[], role: Role | null): NavLink[] {
  if (!role) return [];
  return links.filter((l) => !l.allow || l.allow.includes(role));
}
