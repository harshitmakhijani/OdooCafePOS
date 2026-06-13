import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FileDown, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react';

/** Reports dashboard (PRD §11). */
export function Reports() {
  const [period, setPeriod] = useState('today');

  const metrics = [
    { label: 'Total orders', value: '90', icon: ShoppingBag, color: 'bg-coral' },
    { label: 'Revenue', value: '₹12,450', icon: DollarSign, color: 'bg-paid' },
    { label: 'Avg order value', value: '₹138', icon: TrendingUp, color: 'bg-info' },
  ];

  const topProducts = [
    { name: 'Masala Tea', qty: 45, revenue: '₹1,800' },
    { name: 'Cheese Burger', qty: 22, revenue: '₹5,500' },
    { name: 'Cold Coffee', qty: 18, revenue: '₹2,700' },
    { name: 'Veg Biryani', qty: 15, revenue: '₹3,300' },
    { name: 'Cappuccino', qty: 12, revenue: '₹1,440' },
  ];

  const topCategories = [
    { name: 'Hot Drinks', revenue: '₹3,240', share: '26%' },
    { name: 'Snacks', revenue: '₹2,800', share: '23%' },
    { name: 'Main Course', revenue: '₹2,640', share: '21%' },
    { name: 'Cold Drinks', revenue: '₹2,100', share: '17%' },
    { name: 'Desserts', revenue: '₹1,670', share: '13%' },
  ];

  return (
    <div className="space-y-6">
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title font-bold text-cafe-text">Reports</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This week' },
              { value: 'month', label: 'This month' },
            ]}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
          <Button variant="secondary" size="sm">
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button variant="secondary" size="sm">
            <FileDown className="h-4 w-4" /> XLS
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg ${m.color} border-neo border-cafe-text shadow-neo-sm flex items-center justify-center`}>
                <m.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-label text-cafe-text-muted uppercase tracking-wide">{m.label}</p>
                <p className="text-display font-extrabold text-cafe-text tabular-nums">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-heading font-bold text-cafe-text mb-3">Sales trend</h3>
            <div className="h-48 rounded-lg bg-cafe-surface-2 border border-cafe-border flex items-center justify-center text-cafe-text-muted text-sm font-medium">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Recharts line chart — wire to /reports/sales-trend
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="text-heading font-bold text-cafe-text mb-3">Top categories</h3>
            <div className="h-48 rounded-lg bg-cafe-surface-2 border border-cafe-border flex items-center justify-center text-cafe-text-muted text-sm font-medium">
              <div className="text-center">
                <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Recharts pie chart — wire to /reports/top-categories
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-heading font-bold text-cafe-text mb-3">Top products</h3>
            <div className="border-neo border-cafe-text rounded-lg overflow-hidden">
              <table className="neo-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-right">Qty sold</th>
                    <th className="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.name}>
                      <td className="font-semibold">{p.name}</td>
                      <td className="text-right tabular-nums">{p.qty}</td>
                      <td className="text-right tabular-nums font-semibold">{p.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="text-heading font-bold text-cafe-text mb-3">Top categories</h3>
            <div className="border-neo border-cafe-text rounded-lg overflow-hidden">
              <table className="neo-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="text-right">Revenue</th>
                    <th className="text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {topCategories.map((c) => (
                    <tr key={c.name}>
                      <td className="font-semibold">{c.name}</td>
                      <td className="text-right tabular-nums font-semibold">{c.revenue}</td>
                      <td className="text-right tabular-nums">{c.share}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
