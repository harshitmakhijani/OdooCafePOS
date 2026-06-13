import { useState, useEffect } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';
import { InlineCreateModal } from '@/components/shells/InlineCreateModal';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';

interface Category {
  id: string;
  name: string;
  color: string;
}

const PRESET_COLORS = [
  '#EE7A6B', // Coral
  '#B8A3E3', // Lavender
  '#C3E84D', // Lime Green
  '#FFEB3B', // Yellow
  '#80DEEA', // Sky Blue
  '#FFCC80', // Soft Orange
  '#F48FB1', // Soft Pink
  '#A5D6A7', // Mint Green
];

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog & Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#EE7A6B');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ data: Category[] }>('/categories');
      setCategories(res.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleNew = () => {
    setEditingCategory(null);
    setFormName('');
    setFormColor('#EE7A6B');
    setDialogOpen(true);
  };

  const handleRowClick = (row: Category) => {
    setEditingCategory(row);
    setFormName(row.name);
    setFormColor(row.color);
    setDialogOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formName.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      
      const payload = {
        name: formName.trim(),
        color: formColor,
      };

      if (editingCategory) {
        // Edit existing
        await api.patch(`/categories/${editingCategory.id}`, payload);
      } else {
        // Create new
        await api.post('/categories', payload);
      }

      setDialogOpen(false);
      fetchCategories();
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Failed to save category.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (!window.confirm(`Are you sure you want to delete ${ids.length} categories?`)) return;
    try {
      setError(null);
      await Promise.all(ids.map((id) => api.delete(`/categories/${id}`)));
      fetchCategories();
    } catch (err) {
      console.error(err);
      setError('Failed to delete selected categories. They might be referenced by products.');
    }
  };

  // Client-side search filtering
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ListColumn<Category>[] = [
    { key: 'name', header: 'Name', className: 'font-black text-black' },
    {
      key: 'color',
      header: 'Color Code',
      render: (row) => (
        <span className="inline-flex items-center gap-3">
          <span
            className="h-6 w-6 rounded-full border-2 border-black shadow-neubrutal-sm"
            style={{ backgroundColor: row.color }}
          />
          <span className="font-mono text-xs">{row.color.toUpperCase()}</span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 border-2 border-black bg-red-100 rounded-lg font-bold text-red-700 shadow-neubrutal-sm">
          ⚠️ {error}
        </div>
      )}

      <ListShell<Category>
        title="Categories"
        rows={filteredCategories}
        columns={columns}
        getRowId={(r) => r.id}
        searchValue={search}
        onSearchChange={setSearch}
        newLabel="New Category"
        onNew={handleNew}
        onRowClick={handleRowClick}
        onBulkDelete={handleBulkDelete}
        isLoading={loading}
        emptyMessage="No categories created yet."
      />

      <InlineCreateModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingCategory ? 'Edit Category' : 'New Category'}
        description={editingCategory ? 'Update category name and color theme.' : 'Create a new category for products.'}
        onSubmit={handleFormSubmit}
        submitLabel={editingCategory ? 'Save Changes' : 'Create Category'}
        isSubmitting={submitting}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase mb-1.5 text-black">
              Category Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Hot Drinks"
              className="nb-input w-full font-bold border-2 border-black"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase mb-1.5 text-black">
              Color Swatch Theme
            </label>
            
            {/* Color grid */}
            <div className="grid grid-cols-8 gap-2 mb-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormColor(color)}
                  className={`h-8 w-8 rounded-full border-2 border-black transition-transform flex items-center justify-center ${
                    formColor === color
                      ? 'scale-110 shadow-neubrutal-sm bg-black'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {formColor === color && (
                    <span className="text-[10px] text-white font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Custom color input */}
            <div className="flex items-center gap-3 bg-neutral-50 p-2.5 border-2 border-black rounded-lg">
              <input
                type="color"
                className="h-8 w-8 border border-black cursor-pointer bg-transparent"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
              />
              <span className="text-xs font-bold text-neutral-600 uppercase">
                Custom Color Picker
              </span>
            </div>
          </div>
        </div>
      </InlineCreateModal>
    </div>
  );
}
