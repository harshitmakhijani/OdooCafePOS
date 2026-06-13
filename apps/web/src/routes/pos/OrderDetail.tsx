import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';

interface OrderLine {
  id: string;
  productName: string;
  unitPrice: string;
  quantity: string;
  lineTotal: string;
}

interface OrderDetailData {
  id: string;
  orderNumber: number;
  createdAt: string;
  status: 'DRAFT' | 'PAID' | 'CANCELLED';
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  customer: { id: string; name: string; email: string | null; phone: string | null } | null;
  table: { id: string; tableNumber: number } | null;
  payment: { type: string; status: string; amount: string } | null;
  lines: OrderLine[];
}

const STATUS_STYLES: Record<OrderDetailData['status'], string> = {
  DRAFT: 'bg-[#FFEB3B] text-black',
  PAID: 'bg-neubrutal-lime text-black',
  CANCELLED: 'bg-neubrutal-coral text-white',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** POS Order Detail (PRD §9.7) — Draft: Delete/Edit · Paid: view-only. */
export function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/orders/${orderId}`);
        setOrder(res.data?.data ?? res.data);
      } catch (err) {
        setError('Failed to load order details.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleDelete = async () => {
    if (!order) return;
    if (!window.confirm(`Cancel draft order #${order.orderNumber}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/orders/${order.id}`);
      navigate('/pos/orders');
    } catch (err) {
      setError('Failed to cancel the order.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-neubrutal-coral"></div>
        <p className="font-bold text-black uppercase tracking-wider text-xs">Loading order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/pos/orders')} className="nb-button bg-white p-2.5" title="Back to Orders">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="p-4 border-2 border-black bg-red-100 rounded-lg font-bold text-red-700 shadow-neubrutal-sm">
          ⚠️ {error ?? 'Order not found.'}
        </div>
      </div>
    );
  }

  const isDraft = order.status === 'DRAFT';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-black pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/pos/orders')} className="nb-button bg-white p-2.5" title="Back to Orders">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-black flex items-center gap-3">
              Order #{order.orderNumber}
              <span className={`nb-badge text-[11px] uppercase px-2 py-0.5 ${STATUS_STYLES[order.status]}`}>
                {order.status}
              </span>
            </h1>
            <p className="text-xs text-neutral-600 font-bold mt-1">{formatDateTime(order.createdAt)}</p>
          </div>
        </div>

        {isDraft && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/pos/order?orderId=${order.id}`)}
              className="nb-button-primary px-4 py-2 text-sm uppercase tracking-wider flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="nb-button-destructive px-4 py-2 text-sm uppercase tracking-wider flex items-center gap-2 text-white"
            >
              <Trash2 className="h-4 w-4" />
              <span>{deleting ? 'Cancelling...' : 'Cancel'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="nb-card bg-white p-4">
          <p className="text-[10px] uppercase tracking-wider font-black text-neutral-500">Customer</p>
          <p className="font-extrabold text-black mt-1">{order.customer?.name ?? 'Walk-in'}</p>
          {order.customer?.phone && <p className="font-mono text-xs text-neutral-600">{order.customer.phone}</p>}
        </div>
        <div className="nb-card bg-white p-4">
          <p className="text-[10px] uppercase tracking-wider font-black text-neutral-500">Table</p>
          <p className="font-extrabold text-black mt-1">
            {order.table ? `Table ${order.table.tableNumber}` : 'Takeaway'}
          </p>
        </div>
        <div className="nb-card bg-white p-4">
          <p className="text-[10px] uppercase tracking-wider font-black text-neutral-500">Payment</p>
          <p className="font-extrabold text-black mt-1">
            {order.payment ? `${order.payment.type} · ${order.payment.status}` : 'Unpaid'}
          </p>
        </div>
      </div>

      {/* Line items */}
      <div className="nb-card bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-bold text-black text-left">
            <thead className="bg-neubrutal-cream/40 border-b-2 border-black text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">Item</th>
                <th className="p-4 text-right">Unit Price</th>
                <th className="p-4 text-right">Qty</th>
                <th className="p-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {order.lines.map((line) => (
                <tr key={line.id} className="hover:bg-neutral-50">
                  <td className="p-4 font-extrabold">{line.productName}</td>
                  <td className="p-4 text-right font-mono">₹{Number(line.unitPrice).toFixed(2)}</td>
                  <td className="p-4 text-right font-mono">{Number(line.quantity)}</td>
                  <td className="p-4 text-right font-mono">₹{Number(line.lineTotal).toFixed(2)}</td>
                </tr>
              ))}
              {order.lines.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500 font-bold">
                    This order has no line items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t-2 border-black p-4 bg-neubrutal-cream/10 space-y-1.5 text-sm font-bold">
          <div className="flex justify-between text-neutral-700">
            <span>Subtotal</span>
            <span className="font-mono">₹{Number(order.subtotal).toFixed(2)}</span>
          </div>
          {Number(order.discountTotal) > 0 && (
            <div className="flex justify-between text-red-700">
              <span>Discount</span>
              <span className="font-mono">−₹{Number(order.discountTotal).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-neutral-700">
            <span>Tax</span>
            <span className="font-mono">₹{Number(order.taxTotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-black text-lg font-extrabold border-t border-black/20 pt-2 mt-1">
            <span>Total</span>
            <span className="font-mono">₹{Number(order.total).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
