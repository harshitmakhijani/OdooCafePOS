import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Role } from '@cafe-pos/types';
import { RoleGuard } from '@/auth/RoleGuard';
import { AppShell } from '@/components/layout/AppShell';

import { Login } from './Login';
import { Signup } from './Signup';
import { NotFound } from './NotFound';

import { SessionLanding } from './pos/SessionLanding';
import { OrderView } from './pos/OrderView';
import { Orders } from './pos/Orders';
import { OrderDetail } from './pos/OrderDetail';
import { TableView } from './pos/TableView';
import { Customers } from './pos/Customers';

import { Products } from './admin/Products';
import { Categories } from './admin/Categories';
import { PaymentMethods } from './admin/PaymentMethods';
import { Promotions } from './admin/Promotions';
import { Bookings } from './admin/Bookings';
import { Users } from './admin/Users';
import { Reports } from './admin/Reports';
import { FloorsAndTables } from './admin/FloorsAndTables';

import { Kds } from './kds/Kds';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/pos" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },

  // POS surface — Cashier + Admin (PRD §9 / §12).
  {
    element: <RoleGuard allow={[Role.ADMIN, Role.CASHIER]} />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/pos', element: <SessionLanding /> },
          { path: '/pos/order', element: <OrderView /> },
          { path: '/pos/orders', element: <Orders /> },
          { path: '/pos/orders/:orderId', element: <OrderDetail /> },
          { path: '/pos/tables', element: <TableView /> },
          { path: '/pos/customers', element: <Customers /> },
        ],
      },
    ],
  },

  // Admin backend — Admin only (PRD §8 / §12).
  {
    element: <RoleGuard allow={[Role.ADMIN]} />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/admin', element: <Navigate to="/admin/products" replace /> },
          { path: '/admin/products', element: <Products /> },
          { path: '/admin/categories', element: <Categories /> },
          { path: '/admin/payment-methods', element: <PaymentMethods /> },
          { path: '/admin/promotions', element: <Promotions /> },
          { path: '/admin/bookings', element: <Bookings /> },
          { path: '/admin/users', element: <Users /> },
          { path: '/admin/floors-tables', element: <FloorsAndTables /> },
          { path: '/admin/reports', element: <Reports /> },
        ],
      },
    ],
  },

  // Kitchen Display — Kitchen + Admin (PRD §10 / §12). Standalone (no POS shell).
  {
    element: <RoleGuard allow={[Role.KITCHEN, Role.ADMIN]} />,
    children: [{ path: '/kds', element: <Kds /> }],
  },

  { path: '*', element: <NotFound /> },
]);
