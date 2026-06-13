import { useState } from 'react';
import { CategoryChip } from '@/components/ui/category-chip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, User, Percent, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Mock Data ─── */
const CATEGORIES = [
  { id: 'all', name: 'All', color: '#A67C52' },
  { id: 'cat-1', name: 'Hot Drinks', color: '#D97706' },
  { id: 'cat-2', name: 'Cold Drinks', color: '#2563EB' },
  { id: 'cat-3', name: 'Snacks', color: '#DC2626' },
  { id: 'cat-4', name: 'Main Course', color: '#16A34A' },
  { id: 'cat-5', name: 'Desserts', color: '#9333EA' },
];

const PRODUCTS = [
  { id: 'p1', name: 'Masala Tea', price: 40, categoryId: 'cat-1', color: '#D97706' },
  { id: 'p2', name: 'Cappuccino', price: 120, categoryId: 'cat-1', color: '#D97706' },
  { id: 'p3', name: 'Espresso', price: 90, categoryId: 'cat-1', color: '#D97706' },
  { id: 'p4', name: 'Cold Coffee', price: 150, categoryId: 'cat-2', color: '#2563EB' },
  { id: 'p5', name: 'Iced Latte', price: 160, categoryId: 'cat-2', color: '#2563EB' },
  { id: 'p6', name: 'Fresh Lime Soda', price: 70, categoryId: 'cat-2', color: '#2563EB' },
  { id: 'p7', name: 'Cheese Burger', price: 250, categoryId: 'cat-3', color: '#DC2626' },
  { id: 'p8', name: 'Paneer Tikka', price: 280, categoryId: 'cat-4', color: '#16A34A' },
  { id: 'p9', name: 'Veg Biryani', price: 220, categoryId: 'cat-4', color: '#16A34A' },
  { id: 'p10', name: 'Gulab Jamun', price: 80, categoryId: 'cat-5', color: '#9333EA' },
  { id: 'p11', name: 'Brownie', price: 120, categoryId: 'cat-5', color: '#9333EA' },
  { id: 'p12', name: 'Samosa', price: 30, categoryId: 'cat-3', color: '#DC2626' },
];

interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  color: string;
  hasPromo?: boolean;
}

type KeypadMode = 'qty' | 'price' | 'disc';

/**
 * POS Order View — the 3-column centerpiece (PRD §9.4).
 * Product grid | Cart + Summary | Payment + Keypad
 */
export function OrderView() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [keypadMode, setKeypadMode] = useState<KeypadMode>('qty');
  const [keypadValue, setKeypadValue] = useState('');

  // Filter products by category
  const filteredProducts =
    activeCategory === 'all'
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.categoryId === activeCategory);

  // Add to cart
  const addToCart = (product: (typeof PRODUCTS)[0]) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, unitPrice: product.price, quantity: 1, color: product.color },
      ];
    });
    setSelectedLine(product.id);
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
    if (selectedLine === productId) setSelectedLine(null);
  };

  // Keypad input
  const handleKeypad = (key: string) => {
    if (key === '⌫') {
      setKeypadValue((v) => v.slice(0, -1));
    } else if (key === 'C') {
      setKeypadValue('');
    } else {
      setKeypadValue((v) => v + key);
    }
  };

  // Apply keypad value
  const applyKeypad = () => {
    if (!selectedLine || !keypadValue) return;
    const num = parseFloat(keypadValue);
    if (isNaN(num)) return;

    setCart((prev) =>
      prev.map((l) => {
        if (l.productId !== selectedLine) return l;
        if (keypadMode === 'qty') return { ...l, quantity: num };
        if (keypadMode === 'price') return { ...l, unitPrice: num };
        return l;
      }),
    );
    setKeypadValue('');
  };

  // Compute summary (client-side preview — server is authoritative)
  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discount = 0; // placeholder
  const tax = Math.round((subtotal - discount) * 0.05 * 100) / 100; // 5% placeholder
  const total = subtotal - discount + tax;

  const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '⌫'];

  return (
    <div className="flex gap-4 h-[calc(100vh-5rem)] -my-6 -mx-4 px-4 py-4">
      {/* ═══ PRODUCT COLUMN ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat.id}
              name={cat.name}
              color={cat.color}
              active={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
            />
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                className="neo-card-interactive text-left p-4 min-h-[80px] flex flex-col justify-between touch-target"
              >
                <div className="flex items-start gap-2">
                  <span
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0 border border-cafe-text"
                    style={{ backgroundColor: product.color }}
                  />
                  <span className="text-sm font-semibold text-cafe-text leading-tight">
                    {product.name}
                  </span>
                </div>
                <span className="text-heading font-bold text-coral mt-2">
                  ₹{product.price}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CART COLUMN ═══ */}
      <div className="w-[320px] flex flex-col bg-cafe-surface border-neo border-cafe-text rounded-lg shadow-neo overflow-hidden shrink-0">
        {/* Cart header */}
        <div className="px-4 py-3 border-b-[3px] border-cafe-text bg-coral-soft">
          <h2 className="text-heading font-bold text-cafe-text">Cart</h2>
        </div>

        {/* Cart lines */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-cafe-text-muted font-medium p-4">
              Tap a product to add it
            </div>
          ) : (
            <div className="divide-y divide-cafe-border">
              {cart.map((line) => (
                <div
                  key={line.productId}
                  onClick={() => setSelectedLine(line.productId)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                    selectedLine === line.productId
                      ? 'bg-coral-soft'
                      : 'hover:bg-cafe-surface-2',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-cafe-text truncate">{line.name}</p>
                      {line.hasPromo && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">promo</Badge>}
                    </div>
                    <p className="text-xs text-cafe-text-muted">
                      ₹{line.unitPrice} × {line.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-cafe-text tabular-nums">
                    ₹{(line.unitPrice * line.quantity).toFixed(0)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromCart(line.productId);
                    }}
                    className="p-1 rounded hover:bg-cancelled-bg transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-cancelled" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="border-t-[3px] border-cafe-text px-4 py-3 space-y-1.5 bg-cafe-surface-2">
          <div className="flex justify-between text-sm text-cafe-text-muted">
            <span>Subtotal</span>
            <span className="tabular-nums font-semibold">₹{subtotal.toFixed(0)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-paid font-semibold">
              <span>Discount</span>
              <span className="tabular-nums">−₹{discount.toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-cafe-text-muted">
            <span>Tax (GST)</span>
            <span className="tabular-nums font-semibold">₹{tax.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-lg font-extrabold text-cafe-text pt-1 border-t border-cafe-border">
            <span>Total</span>
            <span className="tabular-nums">₹{total.toFixed(0)}</span>
          </div>
        </div>

        {/* Actions row */}
        <div className="px-4 py-3 border-t border-cafe-border flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs">
            <User className="h-3.5 w-3.5" /> Customer
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs">
            <Percent className="h-3.5 w-3.5" /> Discount
          </Button>
        </div>
        <div className="px-4 pb-3">
          <Button className="w-full" size="touch" disabled={cart.length === 0}>
            <Send className="h-4 w-4" /> Send to kitchen
          </Button>
        </div>
      </div>

      {/* ═══ PAYMENT COLUMN ═══ */}
      <div className="w-[240px] flex flex-col bg-cafe-surface border-neo border-cafe-text rounded-lg shadow-neo overflow-hidden shrink-0">
        {/* Total */}
        <div className="px-4 py-4 border-b-[3px] border-cafe-text bg-coral text-center">
          <p className="text-xs font-semibold text-coral-foreground/80 uppercase tracking-wide">Total</p>
          <p className="text-display font-extrabold text-coral-foreground tabular-nums">
            ₹{total.toFixed(0)}
          </p>
        </div>

        {/* Payment methods */}
        <div className="px-3 py-3 space-y-2">
          {['Cash', 'Card', 'UPI'].map((method) => (
            <Button key={method} variant="secondary" className="w-full justify-start" size="touch">
              {method}
            </Button>
          ))}
        </div>

        {/* Numeric keypad */}
        <div className="flex-1 px-3 py-2">
          {/* Keypad display */}
          <div className="mb-2 h-10 rounded-lg border-neo border-cafe-text bg-white px-3 flex items-center justify-end text-lg font-bold text-cafe-text tabular-nums">
            {keypadValue || '0'}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeypad(key)}
                className="neo-key text-base"
              >
                {key}
              </button>
            ))}
          </div>

          {/* Apply button */}
          <Button
            variant="secondary"
            size="sm"
            className="w-full mt-2"
            onClick={applyKeypad}
            disabled={!selectedLine || !keypadValue}
          >
            Apply
          </Button>
        </div>

        {/* Mode toggles */}
        <div className="px-3 pb-3 grid grid-cols-3 gap-1.5">
          {(['qty', 'price', 'disc'] as KeypadMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setKeypadMode(mode);
                setKeypadValue('');
              }}
              className={cn(
                'py-2 rounded-lg text-xs font-bold border-neo border-cafe-text transition-all uppercase tracking-wide',
                keypadMode === mode
                  ? 'bg-coral text-coral-foreground shadow-none translate-x-[1px] translate-y-[1px]'
                  : 'bg-cafe-surface text-cafe-text shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none',
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
