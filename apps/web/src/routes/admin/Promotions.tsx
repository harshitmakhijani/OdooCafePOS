import { useState, useEffect } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';
import { FormShell } from '@/components/shells/FormShell';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { PromotionType, PromotionScope, DiscountType } from '@cafe-pos/types';

interface Product {
  id: string;
  name: string;
}

interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  code: string | null;
  scope: PromotionScope;
  productId: string | null;
  product?: Product;
  minQuantity: number | null;
  minOrderAmount: string | number | null;
  discountType: DiscountType;
  discountValue: string | number;
  active: boolean;
  description: string | null;
}

export function Promotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Navigation / View states
  const [view, setView] = useState<'list' | 'form'>('list');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states (Promotion)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<PromotionType>(PromotionType.COUPON);
  const [formCode, setFormCode] = useState('');
  const [formScope, setFormScope] = useState<PromotionScope>(PromotionScope.ORDER);
  const [formProductId, setFormProductId] = useState('');
  const [formMinQty, setFormMinQty] = useState('1');
  const [formMinAmount, setFormMinAmount] = useState('');
  const [formDiscType, setFormDiscType] = useState<DiscountType>(DiscountType.PERCENTAGE);
  const [formDiscValue, setFormDiscValue] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [promosRes, prodsRes] = await Promise.all([
        api.get<{ data: Promotion[] }>('/promotions'),
        api.get<{ data: Product[] }>('/products'),
      ]);
      setPromotions(promosRes.data.data);
      setProducts(prodsRes.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load promotions or products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleNew = () => {
    setEditingPromo(null);
    setFormName('');
    setFormType(PromotionType.COUPON);
    setFormCode('');
    setFormScope(PromotionScope.ORDER);
    setFormProductId(products[0]?.id || '');
    setFormMinQty('1');
    setFormMinAmount('');
    setFormDiscType(DiscountType.PERCENTAGE);
    setFormDiscValue('');
    setFormActive(true);
    setFormDesc('');
    setView('form');
  };

  const handleRowClick = (row: Promotion) => {
    setEditingPromo(row);
    setFormName(row.name);
    setFormType(row.type);
    setFormCode(row.code || '');
    setFormScope(row.scope);
    setFormProductId(row.productId || products[0]?.id || '');
    setFormMinQty(String(row.minQuantity || '1'));
    setFormMinAmount(row.minOrderAmount ? String(row.minOrderAmount) : '');
    setFormDiscType(row.discountType);
    setFormDiscValue(String(row.discountValue));
    setFormActive(row.active);
    setFormDesc(row.description || '');
    setView('form');
  };

  const handlePromoSubmit = async () => {
    if (!formName.trim() || !formDiscValue) return;

    if (formType === PromotionType.COUPON && !formCode.trim()) {
      alert('Coupon code is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: Record<string, unknown> = {
        name: formName.trim(),
        type: formType,
        discountType: formDiscType,
        discountValue: parseFloat(formDiscValue),
        active: formActive,
        description: formDesc.trim() || undefined,
      };

      if (formType === PromotionType.COUPON) {
        payload.code = formCode.trim().toUpperCase();
      } else {
        payload.scope = formScope;
        if (formScope === PromotionScope.PRODUCT) {
          payload.productId = formProductId;
          payload.minQuantity = parseInt(formMinQty);
        } else {
          payload.minOrderAmount = parseFloat(formMinAmount || '0');
        }
      }

      if (editingPromo) {
        await api.patch(`/promotions/${editingPromo.id}`, payload);
      } else {
        await api.post('/promotions', payload);
      }

      setView('list');
      fetchInitialData();
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Failed to save promotion.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (!window.confirm(`Are you sure you want to delete ${ids.length} promotions?`)) return;
    try {
      setError(null);
      await Promise.all(ids.map((id) => api.delete(`/promotions/${id}`)));
      fetchInitialData();
    } catch (err) {
      console.error(err);
      setError('Failed to delete selected promotions.');
    }
  };

  // Client side search filter
  const filteredPromos = promotions.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(search.toLowerCase()))
  );

  const columns: ListColumn<Promotion>[] = [
    { key: 'name', header: 'Name', className: 'font-black text-black' },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className={`nb-badge text-xs uppercase font-extrabold ${
          row.type === PromotionType.COUPON ? 'bg-neubrutal-lavender text-black' : 'bg-neubrutal-lime text-black'
        }`}>
          {row.type}
        </span>
      ),
    },
    {
      key: 'code',
      header: 'Coupon Code / Trigger',
      render: (row) => {
        if (row.type === PromotionType.COUPON) {
          return <span className="font-mono bg-neutral-100 px-2 py-1 border border-black rounded text-xs">{row.code}</span>;
        }
        if (row.scope === PromotionScope.PRODUCT) {
          const prodName = row.product?.name || 'Product';
          return <span className="text-xs">Qty ≥ {row.minQuantity} of {prodName}</span>;
        }
        return <span className="text-xs">Order Total ≥ ₹{Number(row.minOrderAmount).toFixed(2)}</span>;
      },
    },
    {
      key: 'discountValue',
      header: 'Value',
      render: (row) => (
        <span className="font-mono text-xs">
          {row.discountType === DiscountType.PERCENTAGE ? `${row.discountValue}% Off` : `₹${Number(row.discountValue).toFixed(2)} Off`}
        </span>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (row) => (
        <span className={`nb-badge text-[10px] uppercase font-black ${
          row.active ? 'bg-neubrutal-lime text-black' : 'bg-neutral-100 text-neutral-500'
        }`}>
          {row.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  if (view === 'form') {
    return (
      <div className="space-y-6">
        {error && (
          <div className="p-4 border-2 border-black bg-red-100 rounded-lg font-bold text-red-700 shadow-neubrutal-sm">
            ⚠️ {error}
          </div>
        )}

        <FormShell
          title={editingPromo ? 'Edit Promotion' : 'New Promotion'}
          onSubmit={handlePromoSubmit}
          onDiscard={() => setView('list')}
          isSubmitting={submitting}
          submitLabel={editingPromo ? 'Save Promotion' : 'Create Promotion'}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Promo/Coupon Name</label>
              <input
                type="text"
                required
                className="nb-input w-full font-bold"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Monsoon Monsoon Special"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Promo Type</label>
              <select
                className="nb-input w-full font-bold"
                value={formType}
                onChange={(e) => setFormType(e.target.value as PromotionType)}
              >
                <option value={PromotionType.COUPON}>COUPON (Cashier enters code)</option>
                <option value={PromotionType.AUTOMATED}>AUTOMATED PROMO (Applied automatically)</option>
              </select>
            </div>

            {/* Conditional fields based on Coupon vs Automated */}
            {formType === PromotionType.COUPON ? (
              <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                <label className="block text-xs font-black uppercase mb-1.5 text-black">Coupon Code</label>
                <input
                  type="text"
                  required
                  className="nb-input w-full font-mono font-bold uppercase"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g. MONSOON50"
                />
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                <label className="block text-xs font-black uppercase mb-1.5 text-black">Trigger Scope</label>
                <select
                  className="nb-input w-full font-bold"
                  value={formScope}
                  onChange={(e) => setFormScope(e.target.value as PromotionScope)}
                >
                  <option value={PromotionScope.ORDER}>ORDER (Based on cart subtotal)</option>
                  <option value={PromotionScope.PRODUCT}>PRODUCT (Based on product item quantity)</option>
                </select>
              </div>
            )}

            {/* Scope details for Automated */}
            {formType === PromotionType.AUTOMATED && formScope === PromotionScope.PRODUCT && (
              <>
                <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="block text-xs font-black uppercase mb-1.5 text-black">Target Product</label>
                  <select
                    required
                    className="nb-input w-full font-bold"
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value)}
                  >
                    <option value="" disabled>Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="block text-xs font-black uppercase mb-1.5 text-black">Minimum Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="nb-input w-full font-bold"
                    value={formMinQty}
                    onChange={(e) => setFormMinQty(e.target.value)}
                  />
                </div>
              </>
            )}

            {formType === PromotionType.AUTOMATED && formScope === PromotionScope.ORDER && (
              <div className="md:col-span-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <label className="block text-xs font-black uppercase mb-1.5 text-black">Minimum Order Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="nb-input w-full font-mono font-bold"
                  value={formMinAmount}
                  onChange={(e) => setFormMinAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Discount Value parameters */}
            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Discount Type</label>
              <select
                className="nb-input w-full font-bold"
                value={formDiscType}
                onChange={(e) => setFormDiscType(e.target.value as DiscountType)}
              >
                <option value={DiscountType.PERCENTAGE}>PERCENTAGE (%)</option>
                <option value={DiscountType.FIXED}>FIXED AMOUNT (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">
                {formDiscType === DiscountType.PERCENTAGE ? 'Discount Percent (%)' : 'Discount Amount (₹)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className="nb-input w-full font-mono font-bold"
                value={formDiscValue}
                onChange={(e) => setFormDiscValue(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Description / Terms</label>
              <textarea
                className="nb-input w-full font-bold min-h-[80px]"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Details about validity, usage..."
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3 bg-neutral-50 p-3.5 border-2 border-black rounded-lg">
              <input
                type="checkbox"
                id="activePromo"
                className="border-2 border-black rounded-sm h-5 w-5 accent-neubrutal-coral cursor-pointer"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
              />
              <label htmlFor="activePromo" className="text-xs font-black uppercase cursor-pointer select-none">
                Active Promotion
              </label>
            </div>
          </div>
        </FormShell>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 border-2 border-black bg-red-100 rounded-lg font-bold text-red-700 shadow-neubrutal-sm">
          ⚠️ {error}
        </div>
      )}

      <ListShell<Promotion>
        title="Promotions"
        rows={filteredPromos}
        columns={columns}
        getRowId={(p) => p.id}
        searchValue={search}
        onSearchChange={setSearch}
        newLabel="New Promo"
        onNew={handleNew}
        onRowClick={handleRowClick}
        onBulkDelete={handleBulkDelete}
        isLoading={loading}
        emptyMessage="No promotions or coupons created yet."
      />
    </div>
  );
}
