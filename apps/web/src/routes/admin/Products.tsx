import { useState, useEffect } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';
import { FormShell } from '@/components/shells/FormShell';
import { InlineCreateModal } from '@/components/shells/InlineCreateModal';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Product {
  id: string;
  name: string;
  categoryId: string;
  category?: Category;
  price: string | number;
  unitOfMeasure: string;
  taxPercent: number;
  description: string | null;
  showOnKds: boolean;
  archived: boolean;
}

export function Products() {
  // Products and Categories lists
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Navigation / View states
  const [view, setView] = useState<'list' | 'form'>('list');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states (Product)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formUoM, setFormUoM] = useState('piece');
  const [formTax, setFormTax] = useState(5);
  const [formDesc, setFormDesc] = useState('');
  const [formKds, setFormKds] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Inline Category dialog states
  const [inlineCategoryOpen, setInlineCategoryOpen] = useState(false);
  const [inlineCatName, setInlineCatName] = useState('');
  const [inlineCatColor, setInlineCatColor] = useState('#EE7A6B');
  const [inlineCatSubmitting, setInlineCatSubmitting] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [prodsRes, catsRes] = await Promise.all([
        api.get<{ data: Product[] }>('/products'),
        api.get<{ data: Category[] }>('/categories'),
      ]);
      setProducts(prodsRes.data.data);
      setCategories(catsRes.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load products or categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleNew = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategoryId(categories[0]?.id || '');
    setFormPrice('');
    setFormUoM('piece');
    setFormTax(5);
    setFormDesc('');
    setFormKds(true);
    setView('form');
  };

  const handleRowClick = (row: Product) => {
    setEditingProduct(row);
    setFormName(row.name);
    setFormCategoryId(row.categoryId);
    setFormPrice(String(row.price));
    setFormUoM(row.unitOfMeasure);
    setFormTax(row.taxPercent);
    setFormDesc(row.description || '');
    setFormKds(row.showOnKds);
    setView('form');
  };

  const handleProductSubmit = async () => {
    if (!formName.trim() || !formCategoryId || !formPrice) return;
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name: formName.trim(),
        categoryId: formCategoryId,
        price: parseFloat(formPrice),
        unitOfMeasure: formUoM,
        taxPercent: formTax,
        description: formDesc.trim() || undefined,
        showOnKds: formKds,
      };

      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/products', payload);
      }

      setView('list');
      fetchInitialData();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (!window.confirm(`Are you sure you want to delete ${ids.length} products?`)) return;
    try {
      setError(null);
      await Promise.all(ids.map((id) => api.delete(`/products/${id}`)));
      fetchInitialData();
    } catch (err: any) {
      console.error(err);
      setError('Failed to delete selected products. They might be referenced in transactions.');
    }
  };

  // Create Category inline from the product form
  const handleInlineCategorySubmit = async () => {
    if (!inlineCatName.trim()) return;
    try {
      setInlineCatSubmitting(true);
      const res = await api.post<{ data: Category }>('/categories', {
        name: inlineCatName.trim(),
        color: inlineCatColor,
      });
      const newCat = res.data.data ?? res.data;
      
      // Update local state list and select it
      setCategories((prev) => [...prev, newCat]);
      setFormCategoryId(newCat.id);
      setInlineCategoryOpen(false);
      setInlineCatName('');
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to create inline category.');
    } finally {
      setInlineCatSubmitting(false);
    }
  };

  // Filter client-side
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ListColumn<Product>[] = [
    { key: 'name', header: 'Name', className: 'font-black text-black' },
    {
      key: 'category',
      header: 'Category',
      render: (row) => {
        const catColor = row.category?.color || '#000000';
        return (
          <span
            className="nb-badge text-xs uppercase text-black font-extrabold"
            style={{ backgroundColor: `${catColor}30`, borderColor: '#000000' }}
          >
            {row.category?.name || 'N/A'}
          </span>
        );
      },
    },
    {
      key: 'price',
      header: 'Price',
      render: (row) => <span className="font-mono">₹{Number(row.price).toFixed(2)}</span>,
    },
    {
      key: 'taxPercent',
      header: 'Tax Rate',
      render: (row) => <span className="font-mono">{row.taxPercent}%</span>,
    },
    {
      key: 'showOnKds',
      header: 'Show On KDS',
      render: (row) => (
        <span className={`nb-badge text-[10px] uppercase font-black ${
          row.showOnKds ? 'bg-neubrutal-lime text-black' : 'bg-neutral-100 text-neutral-500'
        }`}>
          {row.showOnKds ? 'Yes' : 'No'}
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
          title={editingProduct ? 'Edit Product' : 'New Product'}
          onSubmit={handleProductSubmit}
          onDiscard={() => setView('list')}
          isSubmitting={submitting}
          submitLabel={editingProduct ? 'Save Product' : 'Create Product'}
        >
          {/* Product Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Product Name</label>
              <input
                type="text"
                required
                className="nb-input w-full font-bold"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Classic Cappuccino"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black flex items-center justify-between">
                <span>Category</span>
                <button
                  type="button"
                  onClick={() => setInlineCategoryOpen(true)}
                  className="text-neubrutal-coral hover:underline text-[10px] font-black uppercase flex items-center gap-0.5"
                >
                  <Plus className="h-3 w-3" /> Quick Add
                </button>
              </label>
              <select
                required
                className="nb-input w-full font-bold"
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
              >
                <option value="" disabled>Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="nb-input w-full font-mono font-bold"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Unit Of Measure (UOM)</label>
              <input
                type="text"
                required
                className="nb-input w-full font-bold"
                value={formUoM}
                onChange={(e) => setFormUoM(e.target.value)}
                placeholder="e.g. piece, cup, serving"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Tax Slab (GST)</label>
              <select
                required
                className="nb-input w-full font-bold"
                value={formTax}
                onChange={(e) => setFormTax(Number(e.target.value))}
              >
                <option value={5}>5% (Beverages / Standard Cafe)</option>
                <option value={10}>10% (Special Slab)</option>
                <option value={18}>18% (Standard Services)</option>
                <option value={28}>28% (Luxury / Premium items)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Description</label>
              <textarea
                className="nb-input w-full font-bold min-h-[80px]"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Description of ingredients or size..."
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3 bg-neutral-50 p-3.5 border-2 border-black rounded-lg">
              <input
                type="checkbox"
                id="showOnKds"
                className="border-2 border-black rounded-sm h-5 w-5 accent-neubrutal-coral cursor-pointer"
                checked={formKds}
                onChange={(e) => setFormKds(e.target.checked)}
              />
              <label htmlFor="showOnKds" className="text-xs font-black uppercase cursor-pointer select-none">
                Show on Kitchen Display Screen (KDS)
              </label>
            </div>
          </div>
        </FormShell>

        {/* Inline Category Modal */}
        <InlineCreateModal
          open={inlineCategoryOpen}
          onOpenChange={setInlineCategoryOpen}
          title="Add Inline Category"
          description="Create a category quickly without leaving the product form."
          onSubmit={handleInlineCategorySubmit}
          isSubmitting={inlineCatSubmitting}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Category Name</label>
              <input
                type="text"
                required
                className="nb-input w-full font-bold"
                value={inlineCatName}
                onChange={(e) => setInlineCatName(e.target.value)}
                placeholder="e.g. Milkshakes"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Theme Color</label>
              <input
                type="color"
                className="h-8 w-8 border border-black cursor-pointer bg-transparent"
                value={inlineCatColor}
                onChange={(e) => setInlineCatColor(e.target.value)}
              />
            </div>
          </div>
        </InlineCreateModal>
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

      <ListShell<Product>
        title="Products"
        rows={filteredProducts}
        columns={columns}
        getRowId={(p) => p.id}
        searchValue={search}
        onSearchChange={setSearch}
        newLabel="New Product"
        onNew={handleNew}
        onRowClick={handleRowClick}
        onBulkDelete={handleBulkDelete}
        isLoading={loading}
        emptyMessage="No products created yet."
      />
    </div>
  );
}
