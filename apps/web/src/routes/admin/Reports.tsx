import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { FileSpreadsheet, FileText, RotateCcw, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';

interface SummaryMetrics {
  totalOrders: number;
  revenue: number;
  averageOrderValue: number;
}

interface SalesTrendItem {
  date: string;
  revenue: number;
  count: number;
}

interface CategoryRevenue {
  categoryId: string;
  name: string;
  color: string;
  revenue: number;
  count: number;
}

interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface TopOrder {
  orderId: string;
  orderNumber: number;
  customerName: string;
  employeeName: string;
  total: number;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface Product {
  id: string;
  name: string;
}

export function Reports() {
  // Filters state
  const [period, setPeriod] = useState<string>('month');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');

  // Dropdown lists
  const [employees, setEmployees] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Reporting data state
  const [summary, setSummary] = useState<SummaryMetrics>({ totalOrders: 0, revenue: 0, averageOrderValue: 0 });
  const [trend, setTrend] = useState<SalesTrendItem[]>([]);
  const [categories, setCategories] = useState<CategoryRevenue[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topOrders, setTopOrders] = useState<TopOrder[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  // Fetch static dropdowns once
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [usersRes, prodsRes] = await Promise.all([
          api.get<{ data: User[] }>('/users', { params: { pageSize: 100 } }),
          api.get<{ data: Product[] }>('/products', { params: { pageSize: 100 } }),
        ]);
        // Filter users to Admin and Cashiers who handle POS sales
        setEmployees(usersRes.data.data.filter((u) => u.role === 'CASHIER' || u.role === 'ADMIN'));
        setProducts(prodsRes.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch report data on filter changes
  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        period,
        from: period === 'custom' ? from : undefined,
        to: period === 'custom' ? to : undefined,
        employeeId: employeeId || undefined,
        productId: productId || undefined,
      };

      const [summaryRes, trendRes, catsRes, prodsRes, ordersRes] = await Promise.all([
        api.get<{ data: SummaryMetrics }>('/reports/summary', { params }),
        api.get<{ data: SalesTrendItem[] }>('/reports/sales-trend', { params }),
        api.get<{ data: CategoryRevenue[] }>('/reports/top-categories', { params }),
        api.get<{ data: TopProduct[] }>('/reports/top-products', { params }),
        api.get<{ data: TopOrder[] }>('/reports/top-orders', { params }),
      ]);

      setSummary(summaryRes.data.data);
      
      // Map API 'bucket' to 'date' and cast string metrics to numbers
      const formattedTrend = (trendRes.data.data || []).map((item: any) => {
        const d = new Date(item.bucket);
        const dateStr = period === 'today'
          ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        return {
          date: dateStr,
          revenue: Number(item.revenue || 0),
          count: Number(item.orders || 0),
        };
      });
      setTrend(formattedTrend);
      
      setCategories(
        (catsRes.data.data || []).map((c: any) => ({
          ...c,
          revenue: Number(c.revenue || 0),
        }))
      );
      setTopProducts(prodsRes.data.data);
      setTopOrders(ordersRes.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to compute sales analytics. Verify database and filter values.');
    } finally {
      setLoading(false);
    }
  }, [period, from, to, employeeId, productId]);

  useEffect(() => {
    // Only fire if custom ranges are fully filled or non-custom period is selected
    if (period === 'custom' && (!from || !to)) return;
    fetchReportData();
  }, [fetchReportData, period, from, to]);

  const handleResetFilters = () => {
    setPeriod('month');
    setFrom('');
    setTo('');
    setEmployeeId('');
    setProductId('');
  };

  const handleExport = async (format: 'pdf' | 'xls') => {
    try {
      setExporting(format);
      const res = await api.get('/reports/export', {
        params: {
          period,
          from: period === 'custom' ? from : undefined,
          to: period === 'custom' ? to : undefined,
          employeeId: employeeId || undefined,
          productId: productId || undefined,
          format,
        },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales-report-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate export file.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Header and Download buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-4 border-black pb-4">
        <div>
          <h1 className="text-3xl font-black text-black tracking-tight uppercase">Reports & Analytics</h1>
          <p className="text-xs text-neutral-600 font-bold mt-1">Review cafe performance trends and download exports.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('xls')}
            disabled={exporting !== null}
            className="nb-button-accent py-2.5 px-4 text-xs uppercase font-extrabold flex items-center gap-1.5"
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            {exporting === 'xls' ? 'Exporting...' : 'Export Excel'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="nb-button-secondary py-2.5 px-4 text-xs uppercase font-extrabold flex items-center gap-1.5"
          >
            <FileText className="h-4 w-4 shrink-0" />
            {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 border-2 border-black bg-red-100 rounded-lg font-bold text-red-700 shadow-neubrutal-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Filters Grid */}
      <section className="bg-white border-2 border-black p-4 rounded-lg shadow-neubrutal-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
        <div>
          <label className="block text-xs font-black uppercase mb-1 text-black">Time Period</label>
          <select
            className="nb-input w-full py-1.5 border-2 border-black font-bold text-xs"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="today">TODAY</option>
            <option value="week">LAST 7 DAYS</option>
            <option value="month">LAST 30 DAYS</option>
            <option value="custom">CUSTOM DATE RANGE</option>
          </select>
        </div>

        {period === 'custom' && (
          <>
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="block text-xs font-black uppercase mb-1 text-black">Start Date</label>
              <input
                type="date"
                required
                className="nb-input w-full py-1.5 border-2 border-black font-bold text-xs font-mono"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="block text-xs font-black uppercase mb-1 text-black">End Date</label>
              <input
                type="date"
                required
                className="nb-input w-full py-1.5 border-2 border-black font-bold text-xs font-mono"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-black uppercase mb-1 text-black">Cashier / Staff</label>
          <select
            className="nb-input w-full py-1.5 border-2 border-black font-bold text-xs"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">ALL STAFF</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-black uppercase mb-1 text-black">Product Filter</label>
          <select
            className="nb-input w-full py-1.5 border-2 border-black font-bold text-xs"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">ALL PRODUCTS</option>
            {products.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleResetFilters}
            className="nb-button-white w-full py-2 text-xs uppercase font-extrabold flex items-center justify-center gap-1 hover:bg-neutral-100"
          >
            <RotateCcw className="h-4 w-4" /> Reset Filters
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex h-[30vh] flex-col items-center justify-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-black border-t-neubrutal-coral"></div>
          <p className="font-bold text-black uppercase tracking-wider text-sm">Computing statistics...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="nb-card p-5 border-2 border-black shadow-neubrutal-sm bg-white flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-neutral-500 uppercase tracking-wide block">Total Sales Orders</span>
                <p className="text-3xl font-black text-black mt-1 font-mono">{summary.totalOrders}</p>
              </div>
              <div className="bg-neubrutal-lavender/30 border-2 border-black p-3 rounded-lg shadow-neubrutal-sm text-black">
                <ShoppingBag className="h-6 w-6" />
              </div>
            </div>

            <div className="nb-card p-5 border-2 border-black shadow-neubrutal-sm bg-white flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-neutral-500 uppercase tracking-wide block">Total Revenue</span>
                <p className="text-3xl font-black text-black mt-1 font-mono">₹{Number(summary.revenue || 0).toFixed(2)}</p>
              </div>
              <div className="bg-neubrutal-lime/30 border-2 border-black p-3 rounded-lg shadow-neubrutal-sm text-black">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>

            <div className="nb-card p-5 border-2 border-black shadow-neubrutal-sm bg-white flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-neutral-500 uppercase tracking-wide block">Avg Order Value</span>
                <p className="text-3xl font-black text-black mt-1 font-mono">₹{Number(summary.averageOrderValue || 0).toFixed(2)}</p>
              </div>
              <div className="bg-neubrutal-coral-soft border-2 border-black p-3 rounded-lg shadow-neubrutal-sm text-black">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trend Line Chart */}
            <div className="nb-card border-2 border-black p-5 bg-white shadow-neubrutal-sm">
              <h3 className="text-lg font-black uppercase text-black mb-4">Revenue Trend Over Time</h3>
              <div className="h-80 w-full font-bold">
                {trend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-neutral-400 font-bold uppercase text-xs">
                    No trend data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                      <XAxis dataKey="date" stroke="#000" strokeWidth={2} style={{ fontSize: 11, fontFamily: 'monospace' }} />
                      <YAxis stroke="#000" strokeWidth={2} style={{ fontSize: 11, fontFamily: 'monospace' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFF',
                          border: '2px solid black',
                          borderRadius: '8px',
                          boxShadow: '4px 4px 0px 0px #000',
                          fontFamily: 'sans-serif',
                          fontWeight: 'bold',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#EE7A6B"
                        strokeWidth={4}
                        activeDot={{ r: 8, stroke: '#000', strokeWidth: 2 }}
                        name="Revenue (₹)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Category Pie Chart */}
            <div className="nb-card border-2 border-black p-5 bg-white shadow-neubrutal-sm">
              <h3 className="text-lg font-black uppercase text-black mb-4">Category Distribution</h3>
              <div className="h-80 w-full flex flex-col sm:flex-row items-center justify-center">
                {categories.length === 0 ? (
                  <div className="text-neutral-400 font-bold uppercase text-xs">
                    No category data available
                  </div>
                ) : (
                  <>
                    <div className="h-64 w-64 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categories}
                            dataKey="revenue"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {categories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || '#B8A3E3'} stroke="#000" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => `₹${Number(value).toFixed(2)}`}
                            contentStyle={{
                              backgroundColor: '#FFF',
                              border: '2px solid black',
                              borderRadius: '8px',
                              boxShadow: '4px 4px 0px 0px #000',
                              fontFamily: 'sans-serif',
                              fontWeight: 'bold',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Pie Legends */}
                    <div className="flex-1 overflow-y-auto max-h-60 grid grid-cols-1 gap-2 mt-4 sm:mt-0 px-4 font-bold text-xs uppercase select-none">
                      {categories.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span
                            className="h-3.5 w-3.5 border border-black rounded shadow-neubrutal-sm shrink-0"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="text-black leading-tight flex-1">{c.name}</span>
                          <span className="font-mono text-neutral-600">₹{Number(c.revenue || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products Table */}
            <div className="nb-card border-2 border-black p-5 bg-white shadow-neubrutal-sm">
              <h3 className="text-lg font-black uppercase text-black mb-4">Top 10 Selling Products</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-b-2 border-black text-left text-sm font-bold text-black select-none">
                  <thead>
                    <tr className="border-b-2 border-black bg-neubrutal-lavender/30">
                      <th className="px-4 py-2 border-r-2 border-black text-xs uppercase font-black">Product Name</th>
                      <th className="px-4 py-2 border-r-2 border-black text-xs uppercase font-black text-center">Qty Sold</th>
                      <th className="px-4 py-2 text-xs uppercase font-black text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-neutral-500 font-bold uppercase tracking-wider">
                          No product transactions recorded.
                        </td>
                      </tr>
                    ) : (
                      topProducts.map((p, idx) => (
                        <tr key={idx} className="border-b border-black hover:bg-neutral-50">
                          <td className="px-4 py-3 border-r-2 border-black">{p.name}</td>
                          <td className="px-4 py-3 border-r-2 border-black text-center font-mono">{Number(p.quantity)}</td>
                          <td className="px-4 py-3 text-right font-mono">₹{Number(p.revenue).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top High-Value Orders Table */}
            <div className="nb-card border-2 border-black p-5 bg-white shadow-neubrutal-sm">
              <h3 className="text-lg font-black uppercase text-black mb-4">Top 10 High-Value Orders</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-b-2 border-black text-left text-sm font-bold text-black select-none">
                  <thead>
                    <tr className="border-b-2 border-black bg-neubrutal-lavender/30">
                      <th className="px-4 py-2 border-r-2 border-black text-xs uppercase font-black">Order #</th>
                      <th className="px-4 py-2 border-r-2 border-black text-xs uppercase font-black">Customer</th>
                      <th className="px-4 py-2 border-r-2 border-black text-xs uppercase font-black">Cashier</th>
                      <th className="px-4 py-2 text-xs uppercase font-black text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topOrders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-neutral-500 font-bold uppercase tracking-wider">
                          No high-value orders found.
                        </td>
                      </tr>
                    ) : (
                      topOrders.map((o, idx) => (
                        <tr key={idx} className="border-b border-black hover:bg-neutral-50">
                          <td className="px-4 py-3 border-r-2 border-black">#{o.orderNumber}</td>
                          <td className="px-4 py-3 border-r-2 border-black">{o.customerName}</td>
                          <td className="px-4 py-3 border-r-2 border-black">{o.employeeName}</td>
                          <td className="px-4 py-3 text-right font-mono">₹{Number(o.total).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
