import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, Trash2, Printer, Mail } from 'lucide-react';

/** Order detail — read-only for PAID, editable actions for DRAFT (PRD §9.7). */
export function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  // Mock data — will be replaced with API
  const order = {
    id: orderId,
    orderNumber: '#2201',
    date: 'Jun 13, 2026 · 2:30 PM',
    customer: 'Rahul M.',
    status: 'paid' as const,
    lines: [
      { name: 'Masala Tea', qty: 2, unitPrice: 40, total: 80 },
      { name: 'Cheese Burger', qty: 1, unitPrice: 250, total: 250 },
      { name: 'Cold Coffee', qty: 1, unitPrice: 150, total: 150 },
    ],
    subtotal: 480,
    discount: 0,
    tax: 24,
    total: 504,
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-title font-bold text-cafe-text">Order {order.orderNumber}</h1>
          <StatusPill variant={order.status} />
        </div>
      </div>

      {/* Order info */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-cafe-text-muted font-semibold">Date</span>
              <p className="font-bold text-cafe-text">{order.date}</p>
            </div>
            <div>
              <span className="text-cafe-text-muted font-semibold">Customer</span>
              <p className="font-bold text-cafe-text">{order.customer}</p>
            </div>
          </div>

          {/* Lines table */}
          <div className="border-neo border-cafe-text rounded-lg overflow-hidden">
            <table className="neo-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line, i) => (
                  <tr key={i}>
                    <td className="font-semibold">{line.name}</td>
                    <td className="text-right tabular-nums">{line.qty}</td>
                    <td className="text-right tabular-nums">₹{line.unitPrice}</td>
                    <td className="text-right tabular-nums font-semibold">₹{line.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="space-y-1 pt-2 border-t border-cafe-border max-w-xs ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-cafe-text-muted">Subtotal</span>
              <span className="font-semibold tabular-nums">₹{order.subtotal}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-paid">
                <span>Discount</span>
                <span className="font-semibold tabular-nums">−₹{order.discount}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-cafe-text-muted">Tax</span>
              <span className="font-semibold tabular-nums">₹{order.tax}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-cafe-text pt-1 border-t border-cafe-border">
              <span>Total</span>
              <span className="tabular-nums">₹{order.total}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            {order.status === 'draft' ? (
              <>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
                <Button size="sm">
                  <Pencil className="h-4 w-4" /> Edit order
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm">
                  <Printer className="h-4 w-4" /> Print receipt
                </Button>
                <Button variant="secondary" size="sm">
                  <Mail className="h-4 w-4" /> Email receipt
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
