import { Role } from '@cafe-pos/types';

export interface NavLink {
  label: string;
  to: string;
  /** Roles allowed to see this link. Admin is included explicitly where relevant. */
  roles: Role[];
}

/** Primary POS top-bar links (PRD §9.1). */
export const POS_LINKS: NavLink[] = [
  { label: 'POS Order', to: '/pos/order', roles: [Role.ADMIN, Role.CASHIER] },
  { label: 'Orders', to: '/pos/orders', roles: [Role.ADMIN, Role.CASHIER] },
  { label: 'Customer', to: '/pos/customers', roles: [Role.ADMIN, Role.CASHIER] },
  { label: 'Table View', to: '/pos/tables', roles: [Role.ADMIN, Role.CASHIER] },
];

/** Hamburger menu links, role-filtered (PRD §9.1 / §12). */
export const HAMBURGER_LINKS: NavLink[] = [
  { label: 'Products', to: '/admin/products', roles: [Role.ADMIN] },
  { label: 'Category', to: '/admin/categories', roles: [Role.ADMIN] },
  { label: 'Payment Method', to: '/admin/payment-methods', roles: [Role.ADMIN] },
  { label: 'Coupon & Promotion', to: '/admin/promotions', roles: [Role.ADMIN] },
  { label: 'Booking', to: '/admin/bookings', roles: [Role.ADMIN] },
  { label: 'User / Employee', to: '/admin/users', roles: [Role.ADMIN] },
  { label: 'KDS', to: '/kds', roles: [Role.ADMIN, Role.KITCHEN] },
  { label: 'Reports', to: '/admin/reports', roles: [Role.ADMIN] },
];

export function linksForRole(links: NavLink[], role: Role | null): NavLink[] {
  if (!role) return [];
  return links.filter((l) => l.roles.includes(role));
}
