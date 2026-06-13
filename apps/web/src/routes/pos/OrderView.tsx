import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useCartStore } from '@/stores/cart.store';
import {
  Search,
  X,
  Check,
  CreditCard,
  DollarSign
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  categoryId: string;
  price: string;
  unitOfMeasure: string;
  taxPercent: string;
  description: string | null;
  showOnKds: boolean;
  category?: { id: string; name: string; color: string };
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface OrderLine {
  id: string;
  productId: string;
  productName: string;
  unitPrice: string;
  quantity: string;
  taxPercent: string;
  lineTotal: string;
}

interface Order {
  id: string;
  orderNumber: number;
  sessionId: string;
  tableId: string | null;
  customerId: string | null;
  status: 'DRAFT' | 'PAID' | 'CANCELLED';
  appliedPromotionId: string | null;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  version: number;
  lines: OrderLine[];
  customer?: { id: string; name: string; email: string | null; phone: string | null } | null;
}

export function OrderView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');
  const tableNumber = searchParams.get('tableNumber');

  const {
    setActiveOrder,
    setCustomer,
    reset: resetCartStore,
  } = useCartStore();

  // Component states
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Keypad states
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [keypadMode, setKeypadMode] = useState<'qty' | 'price'>('qty');
  const [keypadBuffer, setKeypadBuffer] = useState('');

  // Modals state
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customersList, setCustomersList] = useState<{ id: string; name: string; phone: string | null }[]>([]);

  // Payment Cash Modal states
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [changeDue, setChangeDue] = useState<number | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // Email Receipt state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Debouncing API updates
  const syncTimeoutRef = useRef<any | null>(null);

  // Fetch initial catalog data
  useEffect(() => {
    if (!orderId) {
      navigate('/pos/tables');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [catRes, prodRes, orderRes] = await Promise.all([
          api.get<{ data: Category[] }>('/categories'),
          api.get<{ data: Product[] }>('/products'),
          api.get(`/orders/${orderId}`)
        ]);

        setCategories(catRes.data.data);
        setProducts(prodRes.data.data);
        
        const fetchedOrder = orderRes.data?.data ?? orderRes.data;
        setOrder(fetchedOrder);
        setActiveOrder({ orderId: fetchedOrder.id, tableId: fetchedOrder.tableId });
        if (fetchedOrder.customerId) {
          setCustomer(fetchedOrder.customerId);
        }

        // Default selected line to first item if available
        if (fetchedOrder.lines.length > 0) {
          setSelectedProductId(fetchedOrder.lines[0].productId);
        }
      } catch (err) {
        setError('Failed to initialize POS order view.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  // Sync state to API with debounce
  const syncLinesToBackend = async (linesToSync: { productId: string; quantity: number; unitPrice?: number }[], customerId?: string | null) => {
    if (!order) return;
    setSyncing(true);
    try {
      const res = await api.patch(`/orders/${order.id}`, {
        lines: linesToSync,
        customerId: customerId !== undefined ? customerId : order.customerId,
        version: order.version
      });
      const updatedOrder = res.data?.data ?? res.data;
      setOrder(updatedOrder);
      setError(null);
    } catch (err) {
      const isConflict = (err as { response?: { status?: number } }).response?.status === 409;
      if (isConflict) {
        // Concurrency conflict (PRD §16.2) -> Fetch latest and notify
        setError('This order was updated by another terminal. Refreshing...');
        setTimeout(() => {
          refreshOrder();
        }, 1500);
      } else {
        setError('Failed to sync changes with server.');
      }
    } finally {
      setSyncing(false);
    }
  };

  const refreshOrder = async () => {
    if (!orderId) return;
    try {
      const orderRes = await api.get(`/orders/${orderId}`);
      const fetchedOrder = orderRes.data?.data ?? orderRes.data;
      setOrder(fetchedOrder);
      setError(null);
    } catch (err) {
      setError('Failed to refresh order details.');
    }
  };

  const triggerDebouncedSync = (linesToSync: { productId: string; quantity: number; unitPrice?: number }[]) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncLinesToBackend(linesToSync);
    }, 400);
  };

  // Add Product to Cart
  const handleAddProduct = (product: Product) => {
    if (!order || order.status !== 'DRAFT') return;

    let updatedLines = [...order.lines];
    const existingIndex = updatedLines.findIndex((l) => l.productId === product.id);

    if (existingIndex > -1) {
      const currentQty = parseFloat(updatedLines[existingIndex].quantity);
      updatedLines[existingIndex] = {
        ...updatedLines[existingIndex],
        quantity: (currentQty + 1).toString(),
        lineTotal: (parseFloat(updatedLines[existingIndex].unitPrice) * (currentQty + 1)).toFixed(2)
      };
    } else {
      updatedLines.push({
        id: `temp-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: '1',
        taxPercent: product.taxPercent,
        lineTotal: product.price
      });
    }

    const nextLines = updatedLines.map((l) => ({
      productId: l.productId,
      quantity: parseFloat(l.quantity),
      unitPrice: parseFloat(l.unitPrice)
    }));

    // Update local optimistic state
    setOrder({
      ...order,
      lines: updatedLines
    });
    setSelectedProductId(product.id);
    setKeypadBuffer('');

    triggerDebouncedSync(nextLines);
  };

  // Keypad Actions
  const handleKeypadPress = (val: string) => {
    if (!order || !selectedProductId || order.status !== 'DRAFT') return;

    let newBuffer = keypadBuffer;
    if (val === '⌫') {
      newBuffer = newBuffer.slice(0, -1);
    } else if (val === '.') {
      if (!newBuffer.includes('.')) {
        newBuffer += '.';
      }
    } else {
      newBuffer += val;
    }

    setKeypadBuffer(newBuffer);

    // Apply change to selected line
    const numericVal = parseFloat(newBuffer);
    if (isNaN(numericVal) && newBuffer !== '') return;

    const updatedLines = order.lines.map((line) => {
      if (line.productId === selectedProductId) {
        const qty = keypadMode === 'qty' ? (newBuffer === '' ? 0 : numericVal) : parseFloat(line.quantity);
        const price = keypadMode === 'price' ? (newBuffer === '' ? 0 : numericVal) : parseFloat(line.unitPrice);
        
        return {
          ...line,
          quantity: qty.toString(),
          unitPrice: price.toString(),
          lineTotal: (qty * price).toFixed(2)
        };
      }
      return line;
    });

    setOrder({
      ...order,
      lines: updatedLines
    });

    const nextLines = updatedLines.map((l) => ({
      productId: l.productId,
      quantity: parseFloat(l.quantity),
      unitPrice: parseFloat(l.unitPrice)
    })).filter((l) => l.quantity > 0); // Remove zero quantity lines on save

    triggerDebouncedSync(nextLines);
  };

  // Delete line item
  const handleDeleteLine = (productId: string) => {
    if (!order || order.status !== 'DRAFT') return;
    
    const updatedLines = order.lines.filter((l) => l.productId !== productId);
    setOrder({
      ...order,
      lines: updatedLines
    });

    if (selectedProductId === productId) {
      setSelectedProductId(updatedLines.length > 0 ? updatedLines[0].productId : null);
    }

    const nextLines = updatedLines.map((l) => ({
      productId: l.productId,
      quantity: parseFloat(l.quantity),
      unitPrice: parseFloat(l.unitPrice)
    }));

    triggerDebouncedSync(nextLines);
  };

  // Coupon code submission
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !couponCode) return;
    setCouponError(null);
    try {
      const res = await api.post(`/orders/${order.id}/apply-coupon`, { code: couponCode });
      setOrder(res.data?.data ?? res.data);
      setShowCouponModal(false);
      setCouponCode('');
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? 'Invalid coupon code.';
      setCouponError(msg);
    }
  };

  const handleClearDiscount = async () => {
    if (!order) return;
    try {
      const res = await api.delete(`/orders/${order.id}/discount`);
      setOrder(res.data?.data ?? res.data);
    } catch (err) {
      setError('Failed to clear discount.');
    }
  };

  // Customer modal loader
  const openCustomerSelector = async () => {
    setShowCustomerModal(true);
    try {
      const res = await api.get('/customers', { params: { pageSize: 15 } });
      setCustomersList((res.data?.data ?? res.data) as any);
    } catch (err) {
      // ignore
    }
  };

  const handleLinkCustomer = async (cust: { id: string; name: string }) => {
    if (!order) return;
    setShowCustomerModal(false);
    setCustomer(cust.id);
    
    try {
      setSyncing(true);
      const res = await api.patch(`/orders/${order.id}`, {
        customerId: cust.id,
        version: order.version
      });
      setOrder(res.data?.data ?? res.data);
    } catch (err) {
      setError('Failed to assign customer to order.');
    } finally {
      setSyncing(false);
    }
  };

  // Send order to KDS (PRD §7.6)
  const handleSendToKitchen = async () => {
    if (!order) return;
    try {
      setSyncing(true);
      const res = await api.post(`/orders/${order.id}/send-to-kitchen`);
      setOrder(res.data?.data ?? res.data);
      alert('Order successfully sent to kitchen!');
    } catch (err) {
      setError('Failed to send order to kitchen.');
    } finally {
      setSyncing(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayCheckout = async () => {
    if (!order) return;
    setSyncing(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load Razorpay SDK. Check connection.');
        return;
      }

      const res = await api.post(`/orders/${order.id}/pay/razorpay/create`);
      const { razorpayOrderId, amount, currency, keyId } = res.data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: 'Oddo Cafe',
        description: `Order #${order.orderNumber}`,
        order_id: razorpayOrderId,
        handler: async (response: any) => {
          try {
            setSyncing(true);
            const verifyRes = await api.post(`/orders/${order.id}/pay/razorpay/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            const verifyData = verifyRes.data?.data ?? verifyRes.data;
            setOrder(verifyData.order || verifyData);
            setChangeDue(0);
            setPaymentSuccess(true);
            setShowCashModal(true); // Show confirmation print/email screen
          } catch (err) {
            alert('Razorpay payment signature verification failed.');
          } finally {
            setSyncing(false);
          }
        },
        prefill: {
          name: order.customer?.name || '',
          email: order.customer?.email || '',
          contact: order.customer?.phone || ''
        },
        theme: {
          color: '#EE7A6B'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        alert(`Payment failed: ${resp.error.description}`);
      });
      rzp.open();
    } catch (err) {
      alert('Failed to create Razorpay checkout instance.');
    } finally {
      setSyncing(false);
    }
  };

  // Cash payment calculator
  const handleCashReceivedChange = (val: string) => {
    setCashReceived(val);
    const amount = parseFloat(val);
    if (order && !isNaN(amount) && amount >= parseFloat(order.total)) {
      setChangeDue(amount - parseFloat(order.total));
    } else {
      setChangeDue(null);
    }
  };

  const handleProcessCashPayment = async () => {
    if (!order || !cashReceived) return;
    try {
      setSyncing(true);
      const res = await api.post(`/orders/${order.id}/pay/cash`, {
        cashReceived: parseFloat(cashReceived)
      });
      
      const resData = res.data;
      setOrder(resData.order);
      setChangeDue(parseFloat(resData.changeDue));
      setPaymentSuccess(true);
    } catch (err) {
      alert((err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? 'Cash payment failed.');
    } finally {
      setSyncing(false);
    }
  };

  // Email receipt sender
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !recipientEmail) return;
    setEmailLoading(true);
    setEmailSuccess(false);
    try {
      await api.post(`/orders/${order.id}/receipt/email`, { email: recipientEmail });
      setEmailSuccess(true);
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailSuccess(false);
        setRecipientEmail('');
      }, 1500);
    } catch (err) {
      alert('Failed to send email receipt.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Reset checkout flow and navigate back
  const handleFinishTransaction = () => {
    setShowCashModal(false);
    setPaymentSuccess(false);
    setCashReceived('');
    setChangeDue(null);
    resetCartStore();
    navigate('/pos/tables');
  };

  // const activeLine = order?.lines.find((l) => l.productId === selectedProductId);

  // Filter products by category & search
  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategoryId === 'all' || p.categoryId === activeCategoryId;
    const matchesSearch = searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-black border-t-neubrutal-coral"></div>
        <p className="font-bold text-black uppercase tracking-wider text-sm">Loading order view...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status banner and sync triggers */}
      {error && (
        <div className="p-4 border-2 border-black bg-red-100 rounded-lg font-bold text-red-700 shadow-neubrutal-sm">
          ⚠️ {error}
        </div>
      )}

      {/* POS Top Indicator */}
      <div className="flex justify-between items-center bg-white border-2 border-black p-3 rounded-lg shadow-neubrutal-sm font-bold text-xs uppercase select-none">
        <div className="flex items-center gap-4">
          <span className="nb-badge bg-neubrutal-coral text-white text-[10px]">
            Order #{order?.orderNumber}
          </span>
          {tableNumber && (
            <span className="nb-badge bg-neubrutal-lavender text-black text-[10px]">
              Table {tableNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {syncing && <span className="text-neutral-500 animate-pulse">Syncing totals...</span>}
          <span className={`nb-badge text-[10px] ${order?.status === 'PAID' ? 'bg-neubrutal-lime text-black' : 'bg-[#FBF1DC] text-yellow-800'}`}>
            {order?.status}
          </span>
        </div>
      </div>

      {/* Main 3-Column Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* COLUMN 1: PRODUCT LISTING (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Search bar inside Column 1 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full nb-input pl-9"
            />
          </div>

          {/* Category Selection Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setActiveCategoryId('all')}
              className={`nb-button text-xs py-1.5 px-3 uppercase tracking-wider ${
                activeCategoryId === 'all' ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                style={{
                  borderLeftColor: cat.color,
                  borderLeftWidth: '6px'
                }}
                className={`nb-button text-xs py-1.5 px-3 uppercase tracking-wider ${
                  activeCategoryId === cat.id ? 'bg-neubrutal-lavender text-black' : 'bg-white text-black'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[50vh] lg:max-h-[60vh] p-0.5">
            {filteredProducts.map((prod) => (
              <button
                key={prod.id}
                onClick={() => handleAddProduct(prod)}
                disabled={order?.status !== 'DRAFT'}
                className="nb-card nb-card-hover p-3 text-left bg-white flex flex-col justify-between min-h-[100px] border-2 border-black disabled:opacity-50"
              >
                <span
                  style={{ backgroundColor: prod.category?.color ?? '#CCCCCC' }}
                  className="h-2 w-8 rounded-full border border-black mb-2 block"
                ></span>
                <div>
                  <h4 className="font-extrabold text-sm text-black leading-tight line-clamp-2">
                    {prod.name}
                  </h4>
                  <div className="text-xs font-bold font-mono text-neubrutal-coral mt-1">
                    ₹{parseFloat(prod.price).toFixed(2)}
                  </div>
                </div>
              </button>
            ))}

            {filteredProducts.length === 0 && (
              <div className="col-span-full p-8 text-center text-xs text-neutral-500 font-bold border-2 border-dashed border-neutral-400 bg-white rounded-lg">
                No products found in this category.
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: ACTIVE CART (4 cols) */}
        <div className="lg:col-span-4 nb-card p-4 bg-white flex flex-col justify-between min-h-[50vh] border-2 border-black">
          {/* Cart Header */}
          <div className="border-b-2 border-black pb-2 mb-2 font-bold text-xs uppercase tracking-wider text-black flex justify-between">
            <span>Cart Items</span>
            <span>Qty × Rate</span>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[35vh]">
            {order?.lines.map((line) => {
              const isSelected = selectedProductId === line.productId;
              
              return (
                <div
                  key={line.id}
                  onClick={() => {
                    setSelectedProductId(line.productId);
                    setKeypadBuffer('');
                  }}
                  className={`p-2 border-2 rounded-lg cursor-pointer flex justify-between items-center transition-all ${
                    isSelected
                      ? 'border-black bg-neubrutal-lavender/20 shadow-neubrutal-sm'
                      : 'border-neutral-200 hover:border-black'
                  }`}
                >
                  <div className="font-bold">
                    <div className="text-sm font-extrabold text-black">{line.productName}</div>
                    <div className="text-xs font-mono text-neutral-500 mt-0.5">
                      {parseFloat(line.quantity).toFixed(0)} × ₹{parseFloat(line.unitPrice).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-bold">
                    <div className="text-sm font-mono text-black">
                      ₹{parseFloat(line.lineTotal).toFixed(2)}
                    </div>
                    {order.status === 'DRAFT' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLine(line.productId);
                        }}
                        className="text-red-500 hover:bg-red-50 p-1 rounded border border-transparent hover:border-red-200"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {(!order || order.lines.length === 0) && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500 font-bold text-xs">
                <span>🛒 Cart is empty.</span>
                <span className="mt-1">Tap product cards on the left to add items.</span>
              </div>
            )}
          </div>

          {/* Order Summary & Pricing Totals */}
          <div className="border-t-2 border-black pt-3 mt-3 space-y-1.5 text-xs font-bold text-black">
            <div className="flex justify-between">
              <span className="text-neutral-500">Subtotal:</span>
              <span className="font-mono">₹{order ? parseFloat(order.subtotal).toFixed(2) : '0.00'}</span>
            </div>
            
            {order && parseFloat(order.discountTotal) > 0 && (
              <div className="flex justify-between text-green-700">
                <span className="flex items-center gap-1">
                  Discount:
                  <button
                    onClick={handleClearDiscount}
                    className="text-red-500 hover:underline text-[10px]"
                    title="Remove coupon"
                  >
                    (Clear)
                  </button>
                </span>
                <span className="font-mono">−₹{parseFloat(order.discountTotal).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-neutral-500">Tax (GST):</span>
              <span className="font-mono">₹{order ? parseFloat(order.taxTotal).toFixed(2) : '0.00'}</span>
            </div>

            <div className="flex justify-between border-t border-black pt-2 text-base font-extrabold">
              <span>Total Amount:</span>
              <span className="font-mono text-neubrutal-coral">
                ₹{order ? parseFloat(order.total).toFixed(2) : '0.00'}
              </span>
            </div>

            {/* Actions Bar */}
            <div className="grid grid-cols-2 gap-2 pt-3">
              <button
                onClick={openCustomerSelector}
                disabled={order?.status !== 'DRAFT'}
                className="nb-button bg-white text-xs py-2 uppercase tracking-wide disabled:opacity-50"
              >
                👤 {order?.customer?.name ? order.customer.name.slice(0, 10) : 'Customer'}
              </button>
              
              <button
                onClick={() => {
                  setCouponError(null);
                  setShowCouponModal(true);
                }}
                disabled={order?.status !== 'DRAFT'}
                className="nb-button bg-white text-xs py-2 uppercase tracking-wide disabled:opacity-50"
              >
                🎫 Promo / Code
              </button>

              <button
                onClick={handleSendToKitchen}
                disabled={order?.status !== 'DRAFT' || order.lines.length === 0}
                className="col-span-2 nb-button-primary py-3 text-xs uppercase font-black tracking-widest disabled:opacity-50"
              >
                🔥 Send to Kitchen
              </button>
            </div>
          </div>
        </div>

        {/* COLUMN 3: PAYMENT & NUMERIC KEYPAD (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Large Billing Total Display */}
          <div className="nb-card p-4 bg-white border-2 border-black flex flex-col items-center justify-center text-center shadow-neubrutal-md select-none">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Total Due</span>
            <h2 className="text-3xl font-black font-mono text-black mt-1">
              ₹{order ? parseFloat(order.total).toFixed(2) : '0.00'}
            </h2>
          </div>

          {/* Keypad Mode Selectors */}
          {order?.status === 'DRAFT' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setKeypadMode('qty');
                  setKeypadBuffer('');
                }}
                className={`nb-button text-xs py-2 uppercase tracking-wide font-extrabold ${
                  keypadMode === 'qty' ? 'bg-black text-white' : 'bg-white text-black'
                }`}
              >
                Qty Mode
              </button>
              <button
                onClick={() => {
                  setKeypadMode('price');
                  setKeypadBuffer('');
                }}
                className={`nb-button text-xs py-2 uppercase tracking-wide font-extrabold ${
                  keypadMode === 'price' ? 'bg-black text-white' : 'bg-white text-black'
                }`}
              >
                Price Mode
              </button>
            </div>
          )}

          {/* Numerical Keypad Grid */}
          {order?.status === 'DRAFT' && (
            <div className="nb-card p-2 bg-white border-2 border-black grid grid-cols-3 gap-1.5 font-bold shadow-neubrutal-sm">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '⌫'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleKeypadPress(btn)}
                  disabled={!selectedProductId}
                  className="nb-button py-3 text-sm bg-neubrutal-cream/20 hover:bg-neubrutal-cream/50 text-black border-2 border-black rounded-lg disabled:opacity-45"
                >
                  {btn}
                </button>
              ))}
            </div>
          )}

          {/* Checkout Triggers */}
          <div className="space-y-2">
            <button
              onClick={() => {
                setCashReceived(order?.total || '');
                setChangeDue(0);
                setShowCashModal(true);
              }}
              disabled={!order || order.status !== 'DRAFT' || order.lines.length === 0}
              className="w-full nb-button-primary bg-neubrutal-coral py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <DollarSign className="h-4 w-4" />
              <span>Checkout Cash</span>
            </button>

            <button
              onClick={handleRazorpayCheckout}
              disabled={!order || order.status !== 'DRAFT' || order.lines.length === 0}
              className="w-full nb-button bg-white text-black py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4 text-black" />
              <span>UPI / Card (Razorpay)</span>
            </button>
          </div>
        </div>

      </div>

      {/* Coupon Popup Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm nb-card bg-white p-6 space-y-6">
            <div className="border-b-2 border-black pb-3 flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-black">Redeem Coupon Code</h3>
              <button onClick={() => setShowCouponModal(false)} className="text-black">
                <X className="h-5 w-5" />
              </button>
            </div>

            {couponError && (
              <div className="p-3 border-2 border-black bg-red-100 rounded-lg text-xs font-bold text-red-700">
                ⚠️ {couponError}
              </div>
            )}

            <form onSubmit={handleApplyCoupon} className="space-y-4 font-bold">
              <div className="space-y-1">
                <label htmlFor="coupon" className="text-xs uppercase tracking-wider text-black block">
                  Enter Coupon Code
                </label>
                <input
                  id="coupon"
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  required
                  className="w-full nb-input uppercase font-mono"
                  placeholder="e.g. SAVE20"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="flex-1 nb-button-secondary py-2.5 text-xs uppercase"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 nb-button-primary py-2.5 text-xs uppercase">
                  Apply Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Selector Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm nb-card bg-white p-6 space-y-6">
            <div className="border-b-2 border-black pb-3 flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-black">Assign Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-black">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Create Link */}
            <button
              onClick={() => {
                setShowCustomerModal(false);
                navigate('/pos/customers');
              }}
              className="w-full nb-button bg-white text-xs py-2 uppercase"
            >
              ➕ Manage Customer Accounts
            </button>

            <div className="space-y-2 overflow-y-auto max-h-[30vh]">
              {customersList.map((cust) => (
                <button
                  key={cust.id}
                  onClick={() => handleLinkCustomer(cust)}
                  className="w-full p-2 border-2 border-black bg-neutral-50 hover:bg-neutral-100 rounded-lg text-left text-xs font-bold text-black flex justify-between items-center"
                >
                  <div>
                    <div>{cust.name}</div>
                    <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{cust.phone || 'No phone'}</div>
                  </div>
                  {order?.customerId === cust.id && <Check className="h-4 w-4 text-green-700" />}
                </button>
              ))}

              {customersList.length === 0 && (
                <div className="text-center text-xs text-neutral-500 font-bold p-4">
                  No customers found. Click Manage to add.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Cash Dialog Modal */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm nb-card bg-white p-6 space-y-6">
            <div className="border-b-2 border-black pb-3 flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-black">Cash Checkout</h3>
              {!paymentSuccess && (
                <button onClick={() => setShowCashModal(false)} className="text-black">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {paymentSuccess ? (
              /* Post-payment view */
              <div className="space-y-6 text-center">
                <div className="inline-flex h-12 w-12 border-2 border-black rounded-full bg-neubrutal-lime text-black items-center justify-center font-black">
                  ✓
                </div>
                <div>
                  <h4 className="text-2xl font-black text-black">Transaction Successful</h4>
                  {changeDue !== null && changeDue > 0 && (
                    <div className="p-3 border-2 border-black bg-neubrutal-coral-soft rounded-lg font-black text-black mt-3">
                      Give Change Due: ₹{changeDue.toFixed(2)}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => {
                      if (order) {
                        window.open(`${import.meta.env.VITE_API_URL}/orders/${order.id}/receipt.pdf`, '_blank');
                      }
                    }}
                    className="nb-button bg-white text-xs py-2.5 uppercase tracking-wide font-extrabold"
                  >
                    🖨 Print Invoice
                  </button>
                  <button
                    onClick={() => {
                      setRecipientEmail(order?.customer?.email || '');
                      setShowEmailModal(true);
                    }}
                    className="nb-button bg-white text-xs py-2.5 uppercase tracking-wide font-extrabold"
                  >
                    ✉ Email Receipt
                  </button>
                </div>

                <button
                  onClick={handleFinishTransaction}
                  className="w-full nb-button-primary py-3.5 text-xs font-black uppercase tracking-wider mt-4"
                >
                  Complete Shift & Exit ➔
                </button>
              </div>
            ) : (
              /* Cash entering input form */
              <div className="space-y-4">
                <div className="p-3 border-2 border-black bg-neubrutal-cream/20 rounded-lg text-center font-bold">
                  <div className="text-xs text-neutral-500 uppercase">Amount Due</div>
                  <div className="text-2xl font-black font-mono text-neubrutal-coral mt-1">
                    ₹{order ? parseFloat(order.total).toFixed(2) : '0.00'}
                  </div>
                </div>

                <div className="space-y-1 font-bold">
                  <label htmlFor="cash" className="text-xs uppercase tracking-wider text-black block">
                    Cash Received
                  </label>
                  <input
                    id="cash"
                    type="number"
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => handleCashReceivedChange(e.target.value)}
                    required
                    className="w-full nb-input font-mono text-lg"
                    placeholder="Enter cash..."
                  />
                </div>

                {changeDue !== null && changeDue >= 0 && (
                  <div className="p-3 border-2 border-black bg-neubrutal-cream/30 rounded-lg font-bold text-center">
                    <div className="text-neutral-500 text-xs uppercase">Change Due</div>
                    <div className="text-xl font-mono font-black text-black mt-0.5">
                      ₹{changeDue.toFixed(2)}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleProcessCashPayment}
                  disabled={!cashReceived || (changeDue === null && parseFloat(cashReceived) < parseFloat(order?.total || '0'))}
                  className="w-full nb-button-primary py-3.5 text-xs font-black uppercase tracking-wider mt-2 disabled:opacity-50"
                >
                  Confirm Cash Payment
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Send Email Receipt Dialog */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm nb-card bg-white p-6 space-y-6">
            <div className="border-b-2 border-black pb-3 flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-black">Email Receipt</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-black">
                <X className="h-5 w-5" />
              </button>
            </div>

            {emailSuccess ? (
              <div className="p-4 border-2 border-black bg-green-100 rounded-lg text-center font-bold text-green-700">
                📩 Invoice sent to email address successfully!
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="space-y-4 font-bold">
                <div className="space-y-1">
                  <label htmlFor="email" className="text-xs uppercase tracking-wider text-black block">
                    Customer Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    required
                    className="w-full nb-input"
                    placeholder="e.g. client@example.com"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="flex-1 nb-button-secondary py-2.5 text-xs uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 nb-button-primary py-2.5 text-xs uppercase"
                    disabled={emailLoading}
                  >
                    {emailLoading ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
