import { useState, useEffect } from 'react';
import { LogOut, Clock, RotateCcw, Utensils, Search, CheckCircle, Flame, CookingPot, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { KdsStage, type KdsTicket } from '@cafe-pos/types';
import { useAuth } from '@/auth/AuthContext';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Product {
  id: string;
  name: string;
  categoryId: string;
  showOnKds: boolean;
}

export function Kds() {
  const { user, signOut } = useAuth();
  
  // Tickets, categories, and products state
  const [tickets, setTickets] = useState<KdsTicket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | KdsStage>('ALL');
  
  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  


  // Load initial KDS tickets, categories, and products
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [ticketsRes, catsRes, prodsRes] = await Promise.all([
        api.get<{ data: KdsTicket[] }>('/kds/tickets', { params: { pageSize: 100 } }),
        api.get<{ data: Category[] }>('/categories'),
        api.get<{ data: Product[] }>('/products'),
      ]);
      
      setTickets(ticketsRes.data.data);
      setCategories(catsRes.data.data);
      setProducts(prodsRes.data.data.filter(p => p.showOnKds));
    } catch (err) {
      console.error(err);
      setError('Failed to fetch kitchen tickets or configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Live kitchen clock updating every second
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    


    // Set up Socket.IO listeners for live kitchen updates
    const socket = getSocket();

    socket.on('kds:ticket:new', (newTicket: KdsTicket) => {
      setTickets(prev => {
        // Prevent duplicate tickets
        if (prev.some(t => t.orderId === newTicket.orderId)) return prev;
        return [...prev, newTicket];
      });
    });

    socket.on('kds:ticket:updated', (updatedTicket: KdsTicket) => {
      setTickets(prev =>
        prev.map(t => (t.orderId === updatedTicket.orderId ? updatedTicket : t))
      );
    });

    socket.on('kds:ticket:removed', ({ orderId }) => {
      setTickets(prev => prev.filter(t => t.orderId !== orderId));
    });

    return () => {
      clearInterval(clockTimer);
      socket.off('kds:ticket:new');
      socket.off('kds:ticket:updated');
      socket.off('kds:ticket:removed');
    };
  }, []);

  // Handler to toggle order line completion
  const handleToggleLine = async (orderLineId: string) => {
    try {
      // Optimistic local update
      setTickets(prev =>
        prev.map(ticket => ({
          ...ticket,
          lines: ticket.lines.map(line =>
            line.orderLineId === orderLineId ? { ...line, completed: !line.completed } : line
          ),
        }))
      );
      
      // REST mutation
      await api.patch(`/kds/lines/${orderLineId}/toggle`);
    } catch (err) {
      // Revert / re-fetch on error
      console.error(err);
      fetchData();
    }
  };

  // Handler to advance ticket stage
  const handleAdvanceStage = async (orderId: string) => {
    try {
      const ticket = tickets.find(t => t.orderId === orderId);
      if (!ticket) return;

      let nextStage: KdsStage = ticket.stage;
      if (ticket.stage === KdsStage.TO_COOK) nextStage = KdsStage.PREPARING;
      else if (ticket.stage === KdsStage.PREPARING) nextStage = KdsStage.COMPLETED;
      else return;

      // Optimistic local update
      setTickets(prev =>
        prev.map(t => (t.orderId === orderId ? { ...t, stage: nextStage } : t))
      );

      // REST mutation
      await api.patch(`/kds/tickets/${orderId}/advance`);
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  // Reset all search and drop-down filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedProduct('');
  };

  // Format elapsed time (e.g. "5m ago" or "45m ago")
  const getElapsedTime = (sentTimeStr?: string | null) => {
    if (!sentTimeStr) return 'N/A';
    const sentTime = new Date(sentTimeStr);
    const diffMs = currentTime.getTime() - sentTime.getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    return `${diffMins}m ago`;
  };

  // Determine critical alert level styling based on minutes in kitchen
  const getTimerStyle = (sentTimeStr?: string | null) => {
    if (!sentTimeStr) return 'bg-white border-black text-black';
    const sentTime = new Date(sentTimeStr);
    const diffMins = Math.max(0, Math.floor((currentTime.getTime() - sentTime.getTime()) / 60000));
    if (diffMins >= 15) return 'bg-neubrutal-coral text-white border-black'; // critical delay
    if (diffMins >= 8) return 'bg-[#FFEB3B] text-black border-black'; // warning delay
    return 'bg-white text-black border-black';
  };

  // Calculate live tab counts from current loaded tickets
  const totalCount = tickets.length;
  const toCookCount = tickets.filter(t => t.stage === KdsStage.TO_COOK).length;
  const preparingCount = tickets.filter(t => t.stage === KdsStage.PREPARING).length;
  const completedCount = tickets.filter(t => t.stage === KdsStage.COMPLETED).length;

  // Filter tickets for display based on active filters and stage tabs
  const filteredTickets = tickets.filter(ticket => {
    // 1. Stage Tab filter
    if (activeTab !== 'ALL' && ticket.stage !== activeTab) return false;

    // 2. Search query filter (Order number or item name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchOrderNum = ticket.orderNumber.toString().includes(query);
      const matchItemName = ticket.lines.some(l => l.name.toLowerCase().includes(query));
      if (!matchOrderNum && !matchItemName) return false;
    }

    // 3. Category ID filter
    if (selectedCategory) {
      const matchesCategory = ticket.lines.some(line => {
        const productDetails = products.find(p => p.name.toLowerCase() === line.name.toLowerCase());
        return productDetails?.categoryId === selectedCategory;
      });
      if (!matchesCategory) return false;
    }

    // 4. Product ID filter
    if (selectedProduct) {
      const matchesProduct = ticket.lines.some(line => {
        const productDetails = products.find(p => p.name.toLowerCase() === line.name.toLowerCase());
        return productDetails?.id === selectedProduct;
      });
      if (!matchesProduct) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-neubrutal-cream flex flex-col font-sans">
      {/* KDS Header Bar */}
      <header className="flex flex-wrap h-auto md:h-18 items-center justify-between border-b-4 border-black bg-neubrutal-lavender px-6 py-3 md:py-0 select-none shadow-neubrutal-sm">
        <div className="flex items-center gap-3">
          <div className="bg-black text-white p-2 border-2 border-black rounded-lg shadow-neubrutal-sm">
            <Utensils className="h-6 w-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tight">
            Kitchen Display
          </h1>
        </div>

        <div className="flex items-center gap-6 mt-3 md:mt-0">
          {/* Active Live Connection Status */}
          <div className="flex items-center gap-2 bg-white border-2 border-black px-3 py-1.5 rounded-lg shadow-neubrutal-sm text-xs font-black uppercase">
            <span className="h-3.5 w-3.5 rounded-full bg-neubrutal-lime border border-black animate-pulse" />
            <span>KDS Connected</span>
          </div>

          {/* Current Time Clock */}
          <div className="flex items-center gap-2 bg-white border-2 border-black px-3 py-1.5 rounded-lg shadow-neubrutal-sm text-xs font-mono font-bold">
            <Clock className="h-4 w-4 text-black" />
            <span>{currentTime.toLocaleTimeString('en-US', { hour12: false })}</span>
          </div>

          <div className="flex items-center gap-3 text-sm font-black text-black">
            <span>{user?.name}</span>
            <button
              onClick={signOut}
              className="nb-button-white px-3 py-1.5 text-xs font-extrabold flex items-center gap-1.5 shadow-none hover:shadow-neubrutal-sm active:translate-x-[1px] active:translate-y-[1px]"
            >
              <LogOut className="h-3.5 w-3.5" /> Out
            </button>
          </div>
        </div>
      </header>

      {/* Filter and Control Toolbar */}
      <section className="bg-white border-b-4 border-black p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-neubrutal-sm select-none">
        {/* Ticket Search */}
        <div>
          <label className="block text-xs font-black uppercase mb-1 text-black">Search Tickets</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black stroke-[2.5px]" />
            <input
              type="text"
              placeholder="Order # or Item..."
              className="nb-input w-full pl-9 py-1.5 border-2 border-black font-bold text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filter by Category */}
        <div>
          <label className="block text-xs font-black uppercase mb-1 text-black">Filter Category</label>
          <select
            className="nb-input w-full py-1.5 border-2 border-black font-bold text-xs"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">ALL CATEGORIES</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Product */}
        <div>
          <label className="block text-xs font-black uppercase mb-1 text-black">Filter Product</label>
          <select
            className="nb-input w-full py-1.5 border-2 border-black font-bold text-xs"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="">ALL PRODUCTS</option>
            {products.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.name.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full justify-between md:justify-end">
          <button
            onClick={handleResetFilters}
            className="nb-button-white flex-1 md:flex-none px-4 py-2 text-xs uppercase font-extrabold flex items-center justify-center gap-1.5 hover:bg-neutral-100"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear
          </button>
          <button
            onClick={fetchData}
            className="nb-button-accent flex-1 md:flex-none px-4 py-2 text-xs uppercase font-extrabold flex items-center justify-center gap-1.5"
          >
            Reload
          </button>
        </div>
      </section>

      {/* Stage Tab Filters */}
      <nav className="p-4 flex flex-wrap gap-2 select-none">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`nb-button px-4 py-2 text-xs uppercase tracking-wide font-black ${
            activeTab === 'ALL' ? 'bg-neubrutal-coral text-white' : 'bg-white text-black'
          }`}
        >
          All Stages ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab(KdsStage.TO_COOK)}
          className={`nb-button px-4 py-2 text-xs uppercase tracking-wide font-black flex items-center gap-1.5 ${
            activeTab === KdsStage.TO_COOK ? 'bg-neubrutal-coral text-white' : 'bg-white text-black'
          }`}
        >
          <Flame className="h-3.5 w-3.5" /> To Cook ({toCookCount})
        </button>
        <button
          onClick={() => setActiveTab(KdsStage.PREPARING)}
          className={`nb-button px-4 py-2 text-xs uppercase tracking-wide font-black flex items-center gap-1.5 ${
            activeTab === KdsStage.PREPARING ? 'bg-neubrutal-coral text-white' : 'bg-white text-black'
          }`}
        >
          <CookingPot className="h-3.5 w-3.5" /> Preparing ({preparingCount})
        </button>
        <button
          onClick={() => setActiveTab(KdsStage.COMPLETED)}
          className={`nb-button px-4 py-2 text-xs uppercase tracking-wide font-black flex items-center gap-1.5 ${
            activeTab === KdsStage.COMPLETED ? 'bg-neubrutal-coral text-white' : 'bg-white text-black'
          }`}
        >
          <CheckCircle className="h-3.5 w-3.5" /> Completed ({completedCount})
        </button>
      </nav>

      {/* Error Message */}
      {error && (
        <div className="mx-6 my-4 p-4 border-2 border-black bg-red-100 rounded-lg font-bold text-red-700 shadow-neubrutal-sm">
          ⚠️ {error}
        </div>
      )}

      {/* KDS Grid View */}
      <main className="flex-1 px-6 pb-8">
        {loading ? (
          <div className="flex h-[40vh] flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-black border-t-neubrutal-coral"></div>
            <p className="font-bold text-black uppercase tracking-wider text-sm">Loading KDS Tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex h-[35vh] flex-col items-center justify-center border-2 border-dashed border-black bg-white rounded-xl shadow-neubrutal-sm p-8 text-center">
            <Utensils className="h-12 w-12 text-neutral-400 mb-3" />
            <h3 className="text-lg font-black text-black uppercase">No active prep tickets</h3>
            <p className="text-xs text-neutral-600 font-bold mt-1 max-w-sm">
              Any draft orders sent to the kitchen by cashiers will pop up here instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-start">
            {filteredTickets.map((ticket) => {
              const allLinesDone = ticket.lines.every((l) => l.completed);
              
              // Define header backgrounds depending on stages
              let headerBg = 'bg-neutral-100';
              if (ticket.stage === KdsStage.TO_COOK) headerBg = 'bg-neubrutal-coral-soft';
              else if (ticket.stage === KdsStage.PREPARING) headerBg = 'bg-neubrutal-lavender/30';
              else if (ticket.stage === KdsStage.COMPLETED) headerBg = 'bg-neubrutal-lime/20';

              return (
                <div
                  key={ticket.orderId}
                  className={`nb-card flex flex-col justify-between border-2 border-black shadow-neubrutal-sm bg-white overflow-hidden min-h-[220px] transition-all duration-150 ${
                    ticket.stage === KdsStage.COMPLETED ? 'opacity-80' : ''
                  }`}
                >
                  {/* Ticket Header Card */}
                  <div className={`border-b-2 border-black p-3.5 flex justify-between items-center ${headerBg}`}>
                    <div>
                      <h4 className="text-lg font-black text-black">
                        ORDER #{ticket.orderNumber}
                      </h4>
                      <span className="text-[10px] font-black uppercase text-neutral-600 block mt-0.5">
                        Stage: {ticket.stage.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Preparation Timer Badge */}
                    <div className={`nb-badge px-2 py-1 text-[10px] font-black tracking-wide flex items-center gap-1 ${getTimerStyle(ticket.sentToKitchenAt)}`}>
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{getElapsedTime(ticket.sentToKitchenAt)}</span>
                    </div>
                  </div>

                  {/* Order Line items */}
                  <div className="p-4 flex-1">
                    <ul className="space-y-2.5">
                      {ticket.lines.map((line) => (
                        <li
                          key={line.orderLineId}
                          onClick={() => handleToggleLine(line.orderLineId)}
                          className={`flex items-start gap-2 cursor-pointer select-none p-1.5 rounded hover:bg-neutral-50 active:scale-95 transition-all ${
                            line.completed ? 'text-neutral-400 line-through' : 'text-black font-extrabold'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={line.completed}
                            readOnly
                            className="mt-0.5 border-2 border-black rounded-sm h-4 w-4 accent-neubrutal-coral pointer-events-none"
                          />
                          <span className="text-sm leading-tight">
                            {line.quantity}x {line.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Stage Action Controls */}
                  <div className="border-t-2 border-black p-3 bg-neutral-50 flex flex-col gap-2">
                    {ticket.stage === KdsStage.TO_COOK && (
                      <button
                        onClick={() => handleAdvanceStage(ticket.orderId)}
                        className="nb-button-white w-full py-2 text-xs uppercase font-extrabold flex items-center justify-center gap-1 hover:bg-neubrutal-lavender"
                      >
                        <CookingPot className="h-3.5 w-3.5 shrink-0" /> Start Preparing
                      </button>
                    )}

                    {ticket.stage === KdsStage.PREPARING && (
                      <button
                        onClick={() => handleAdvanceStage(ticket.orderId)}
                        className={`w-full py-2 text-xs uppercase font-extrabold flex items-center justify-center gap-1 ${
                          allLinesDone ? 'nb-button-accent' : 'nb-button-white opacity-85 hover:bg-neutral-100'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        {allLinesDone ? 'Done & Serve' : 'Force Complete'}
                      </button>
                    )}

                    {ticket.stage === KdsStage.COMPLETED && (
                      <div className="bg-neubrutal-lime/20 border-2 border-black text-black rounded-lg py-1.5 px-3 flex items-center justify-center gap-1 text-xs font-black uppercase shadow-neubrutal-sm">
                        <CheckCircle className="h-4 w-4" /> Ready to Serve
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
