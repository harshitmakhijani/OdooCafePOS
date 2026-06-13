import { useState } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2 } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  customer: string;
  amount: string;
  status: 'draft' | 'paid' | 'cancelled';
}

const MOCK_ORDERS: Order[] = [
  { id: '1', orderNumber: '#2201', date: 'Jun 13, 2026', customer: 'Rahul M.', amount: '₹565', status: 'paid' },
  { id: '2', orderNumber: '#2202', date: 'Jun 13, 2026', customer: 'Walk-in', amount: '₹280', status: 'draft' },
  { id: '3', orderNumber: '#2203', date: 'Jun 13, 2026', customer: 'Priya S.', amount: '₹1,200', status: 'paid' },
  { id: '4', orderNumber: '#2204', date: 'Jun 12, 2026', customer: 'Walk-in', amount: '₹150', status: 'cancelled' },
  { id: '5', orderNumber: '#2205', date: 'Jun 12, 2026', customer: 'Amit K.', amount: '₹890', status: 'paid' },
];

const columns: ListColumn<Order>[] = [
  { key: 'orderNumber', header: 'Order #', render: (r) => <span className="font-bold">{r.orderNumber}</span> },
  { key: 'date', header: 'Date' },
  { key: 'customer', header: 'Customer' },
  { key: 'amount', header: 'Amount', numeric: true, render: (r) => <span className="font-semibold">{r.amount}</span> },
  { key: 'status', header: 'Status', render: (r) => <StatusPill variant={r.status} /> },
];

/** Orders list for the current session (PRD §9.7). */
export function Orders() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_ORDERS.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <ListShell
      title="Orders"
      rows={filtered}
      columns={columns}
      getRowId={(r) => r.id}
      searchValue={search}
      onSearchChange={setSearch}
      emptyMessage="No orders yet in this session."
      rowActions={(row) => (
        <>
          <Button variant="ghost" size="icon-sm">
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === 'draft' && (
            <>
              <Button variant="ghost" size="icon-sm">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-cancelled hover:text-cancelled">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </>
      )}
    />
  );
}
