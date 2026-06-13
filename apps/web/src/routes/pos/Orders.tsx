import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { SuccessEnvelope } from '@cafe-pos/types';
import { Search, ArrowLeft, Receipt } from 'lucide-react';

interface OrderListItem {
  id: string;
  orderNumber: number;
  createdAt: string;
  status: 'DRAFT' | 'PAID' | 'CANCELLED';
  total: string;
  customer: { id: string; name: string } | null;
  lines: { id: string }[];
}

interface OrderListResponse {
  data: OrderListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

interface CurrentSessionResponse {
  currentSession: { id: string } | null;
}

const STATUS_STYLES: Record<OrderListItem['status'], string> = {
  DRAFT: 'bg-[#FFEB3B] text-black',
  PAID: 'bg-neubrutal-lime text-black',
  CANCELLED: 'bg-neubrutal-coral text-white',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** POS Orders list for the current session (PRD §9.7). */
export function Orders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [noSession, setNoSession] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve the caller's current open session once (orders are scoped to it).
  useEffect(() => {
    const resolveSession = async () => {
      try {
        const res = await api.get<SuccessEnvelope<CurrentSessionResponse>>('/sessions/current');
        const current = res.data.data.currentSession;
        if (!current) {
          setNoSession(true);
          setLoading(false);
          return;
        }
        setSessionId(current.id);
      } catch (err) {
        setError('Failed to resolve the current session. Check connection.');
        setLoading(false);
      }
    };
    resolveSession();
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<OrderListResponse>('/orders', {
          params: {
            sessionId,
            page,
            pageSize: 10,
            search: search || undefined,
          },
        });
        setOrders(res.data.data);
        setTotalPages(res.data.meta?.totalPages ?? 1);
      } catch (err) {
        setError('Failed to fetch orders. Check connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [sessionId, page, search]);

  if (noSession) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 text-center">
        <Receipt className="h-12 w-12 text-neutral-400" />
        <h1 className="text-2xl font-extrabold text-black">No open session</h1>
        <p className="text-sm font-bold text-neutral-600">Open a register session to view its orders.</p>
        <button onClick={() => navigate('/pos')} className="nb-button-primary px-4 py-2 text-sm uppercase tracking-wider">
          Go to Session
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b-2 border-black pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/pos/tables')} className="nb-button bg-white p-2.5" title="Back to Tables">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-black">Orders</h1>
            <p className="text-xs text-neutral-600 font-bold mt-1">Orders for the current register session.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 border-2 border-black bg-red-100 rounded-lg font-bold text-red-700 shadow-neubrutal-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          placeholder="Search by order number, customer, or date (YYYY-MM-DD)..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full nb-input pl-10 py-3"
        />
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex h-[40vh] flex-col items-center justify-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-neubrutal-coral"></div>
          <p className="font-bold text-black uppercase tracking-wider text-xs">Fetching orders...</p>
        </div>
      ) : (
        <div className="nb-card bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-bold text-black text-left">
              <thead className="bg-neubrutal-cream/40 border-b-2 border-black text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Order #</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Items</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/pos/orders/${order.id}`)}
                    className="hover:bg-neutral-50 cursor-pointer"
                  >
                    <td className="p-4 font-extrabold text-black">#{order.orderNumber}</td>
                    <td className="p-4 font-mono text-xs">{formatDateTime(order.createdAt)}</td>
                    <td className="p-4">{order.customer?.name ?? '—'}</td>
                    <td className="p-4 font-mono text-xs">{order.lines.length}</td>
                    <td className="p-4 text-right font-extrabold">₹{Number(order.total).toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <span className={`nb-badge text-[10px] uppercase px-2 py-0.5 ${STATUS_STYLES[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-500 font-bold">
                      No orders found for this session.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t-2 border-black bg-neubrutal-cream/10 flex justify-between items-center">
              <span className="text-xs text-neutral-600 font-bold">
                Showing Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="nb-button bg-white text-xs py-1 px-3"
                >
                  ◀ Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="nb-button bg-white text-xs py-1 px-3"
                >
                  Next ▶
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
