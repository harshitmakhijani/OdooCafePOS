import { useState } from 'react';
import { LogOut, Search, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusPill } from '@/components/ui/status-pill';
import { useAuth } from '@/auth/AuthContext';
import { cn } from '@/lib/utils';

type Stage = 'all' | 'to-cook' | 'preparing' | 'completed';

interface TicketLine {
  id: string;
  name: string;
  qty: number;
  completed: boolean;
}

interface Ticket {
  id: string;
  orderNumber: number;
  stage: 'to-cook' | 'preparing' | 'completed';
  lines: TicketLine[];
}

const MOCK_TICKETS: Ticket[] = [
  {
    id: 'o1', orderNumber: 2201, stage: 'to-cook',
    lines: [
      { id: 'l1', name: 'Masala Tea', qty: 3, completed: false },
      { id: 'l2', name: 'Cheese Burger', qty: 2, completed: false },
      { id: 'l3', name: 'Cold Coffee', qty: 1, completed: false },
    ],
  },
  {
    id: 'o2', orderNumber: 2202, stage: 'to-cook',
    lines: [
      { id: 'l4', name: 'Veg Biryani', qty: 1, completed: false },
      { id: 'l5', name: 'Gulab Jamun', qty: 2, completed: false },
    ],
  },
  {
    id: 'o3', orderNumber: 2203, stage: 'preparing',
    lines: [
      { id: 'l6', name: 'Cappuccino', qty: 2, completed: true },
      { id: 'l7', name: 'Paneer Tikka', qty: 1, completed: false },
      { id: 'l8', name: 'Brownie', qty: 3, completed: false },
    ],
  },
  {
    id: 'o4', orderNumber: 2204, stage: 'preparing',
    lines: [
      { id: 'l9', name: 'Iced Latte', qty: 4, completed: true },
      { id: 'l10', name: 'Samosa', qty: 6, completed: true },
    ],
  },
  {
    id: 'o5', orderNumber: 2205, stage: 'completed',
    lines: [
      { id: 'l11', name: 'Masala Tea', qty: 2, completed: true },
      { id: 'l12', name: 'Fresh Lime Soda', qty: 1, completed: true },
    ],
  },
];

const FILTERS = {
  products: ['Masala Tea', 'Cheese Burger', 'Cappuccino', 'Veg Biryani', 'Paneer Tikka'],
  categories: ['Hot Drinks', 'Cold Drinks', 'Snacks', 'Main Course', 'Desserts'],
};

const stageBorderColor: Record<string, string> = {
  'to-cook': 'border-l-draft',
  preparing: 'border-l-info',
  completed: 'border-l-paid',
};

/**
 * Kitchen Display System — Neubrutalism styled (PRD §10).
 * Standalone layout (no POS shell).
 */
export function Kds() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Stage>('all');
  const [tickets, setTickets] = useState(MOCK_TICKETS);
  const [search, setSearch] = useState('');

  const tabs: { key: Stage; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'to-cook', label: 'To cook' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'completed', label: 'Completed' },
  ];

  const counts = {
    all: tickets.length,
    'to-cook': tickets.filter((t) => t.stage === 'to-cook').length,
    preparing: tickets.filter((t) => t.stage === 'preparing').length,
    completed: tickets.filter((t) => t.stage === 'completed').length,
  };

  const filtered = tickets.filter((t) => {
    if (activeTab !== 'all' && t.stage !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        String(t.orderNumber).includes(q) ||
        t.lines.some((l) => l.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const advanceStage = (id: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (t.stage === 'to-cook') return { ...t, stage: 'preparing' };
        if (t.stage === 'preparing') return { ...t, stage: 'completed' };
        return t;
      }),
    );
  };

  const toggleItem = (ticketId: string, lineId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          lines: t.lines.map((l) =>
            l.id === lineId ? { ...l, completed: !l.completed } : l,
          ),
        };
      }),
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* KDS Header */}
      <header className="sticky top-0 z-30 border-b-[3px] border-cafe-text bg-cafe-surface px-4">
        <div className="flex h-16 items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-coral border-neo border-cafe-text shadow-neo-sm flex items-center justify-center">
              <Coffee className="h-5 w-5 text-coral-foreground" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-cafe-text">KDS</span>
          </div>

          {/* Stage tabs with counts */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold border-neo transition-all',
                  activeTab === tab.key
                    ? 'bg-coral text-coral-foreground border-cafe-text shadow-none translate-x-[1px] translate-y-[1px]'
                    : 'border-transparent text-cafe-text-muted hover:bg-cafe-surface-2 hover:border-cafe-text',
                )}
              >
                {tab.label}
                <span className={cn(
                  'text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                  activeTab === tab.key
                    ? 'bg-coral-foreground/20 text-coral-foreground'
                    : 'bg-cafe-surface-2 text-cafe-text-muted',
                )}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </nav>

          {/* Search */}
          <div className="relative ml-auto w-56 hidden lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cafe-text-muted" />
            <Input placeholder="Search tickets…" className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {/* User + logout */}
          <div className="flex items-center gap-3 ml-auto lg:ml-0">
            <span className="text-sm font-semibold text-cafe-text-muted">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Log out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left rail — filters */}
        <aside className="hidden lg:block w-56 shrink-0 border-r-[3px] border-cafe-text bg-cafe-surface p-4 min-h-[calc(100vh-4rem)]">
          <div className="space-y-5">
            <div>
              <h3 className="text-label font-bold text-cafe-text-muted uppercase tracking-wide mb-2">Product</h3>
              <div className="space-y-1.5">
                {FILTERS.products.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm text-cafe-text cursor-pointer hover:text-coral">
                    <Checkbox />
                    {p}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-label font-bold text-cafe-text-muted uppercase tracking-wide mb-2">Category</h3>
              <div className="space-y-1.5">
                {FILTERS.categories.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm text-cafe-text cursor-pointer hover:text-coral">
                    <Checkbox />
                    {c}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Ticket grid */}
        <main className="flex-1 p-4">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-cafe-text-muted text-sm font-medium">
              No tickets to display.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((ticket) => (
                <div
                  key={ticket.id}
                  className={cn(
                    'bg-cafe-surface border-neo border-cafe-text rounded-lg shadow-neo overflow-hidden cursor-pointer transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-hover border-l-[6px]',
                    stageBorderColor[ticket.stage],
                  )}
                  onClick={() => advanceStage(ticket.id)}
                >
                  {/* Ticket header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-cafe-border bg-coral-soft">
                    <span className="text-heading font-extrabold text-cafe-text">
                      #{ticket.orderNumber}
                    </span>
                    <StatusPill variant={ticket.stage as 'to-cook' | 'preparing' | 'completed'} />
                  </div>

                  {/* Ticket lines */}
                  <div className="px-4 py-3 space-y-1.5">
                    {ticket.lines.map((line) => (
                      <div
                        key={line.id}
                        className={cn(
                          'flex items-center gap-2 text-sm',
                          line.completed && 'line-through opacity-50',
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItem(ticket.id, line.id);
                        }}
                      >
                        <span className="font-bold text-cafe-text-muted w-6">{line.qty}×</span>
                        <span className="font-semibold text-cafe-text">{line.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
