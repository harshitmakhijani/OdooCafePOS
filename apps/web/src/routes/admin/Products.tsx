import { useState, type FormEvent } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';
import { CategoryChip } from '@/components/ui/category-chip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { InlineCreateModal } from '@/components/shells/InlineCreateModal';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  categoryColor: string;
  price: number;
  tax: string;
  showOnKds: boolean;
}

const MOCK: Product[] = [
  { id: 'p1', name: 'Masala Tea', category: 'Hot Drinks', categoryColor: '#D97706', price: 40, tax: '5%', showOnKds: true },
  { id: 'p2', name: 'Cappuccino', category: 'Hot Drinks', categoryColor: '#D97706', price: 120, tax: '5%', showOnKds: true },
  { id: 'p3', name: 'Cheese Burger', category: 'Snacks', categoryColor: '#DC2626', price: 250, tax: '18%', showOnKds: true },
  { id: 'p4', name: 'Veg Biryani', category: 'Main Course', categoryColor: '#16A34A', price: 220, tax: '5%', showOnKds: true },
  { id: 'p5', name: 'Gulab Jamun', category: 'Desserts', categoryColor: '#9333EA', price: 80, tax: '5%', showOnKds: false },
  { id: 'p6', name: 'Cold Coffee', category: 'Cold Drinks', categoryColor: '#2563EB', price: 150, tax: '18%', showOnKds: true },
];

const columns: ListColumn<Product>[] = [
  { key: 'name', header: 'Name', render: (r) => <span className="font-semibold">{r.name}</span> },
  { key: 'category', header: 'Category', render: (r) => <CategoryChip name={r.category} color={r.categoryColor} /> },
  { key: 'price', header: 'Price', numeric: true, render: (r) => <span className="font-semibold">₹{r.price}</span> },
  { key: 'tax', header: 'Tax' },
];

const TAX_OPTIONS = [
  { value: '5', label: 'GST 5%' },
  { value: '10', label: 'GST 10%' },
  { value: '18', label: 'GST 18%' },
  { value: '28', label: 'GST 28%' },
];

const CAT_OPTIONS = [
  { value: 'cat-1', label: 'Hot Drinks' },
  { value: 'cat-2', label: 'Cold Drinks' },
  { value: 'cat-3', label: 'Snacks' },
  { value: 'cat-4', label: 'Main Course' },
  { value: 'cat-5', label: 'Desserts' },
];

/** Admin Products CRUD (PRD §8.2). */
export function Products() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [inlineCreate, setInlineCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = MOCK.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => { setModalOpen(false); setSaving(false); }, 300);
  };

  return (
    <>
      <ListShell
        title="Products"
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchValue={search}
        onSearchChange={setSearch}
        onNew={() => setModalOpen(true)}
        newLabel="New product"
        emptyMessage="No products yet. Create your first one."
        onBulkDelete={(ids) => console.log('delete', ids)}
        onBulkArchive={(ids) => console.log('archive', ids)}
        rowActions={(row) => (
          <>
            <Button variant="ghost" size="icon-sm" onClick={() => setModalOpen(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="text-cancelled">
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      />

      {/* Product create/edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="Product name" required />
              </div>
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input type="number" placeholder="0.00" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <div className="flex gap-2">
                  <Select options={CAT_OPTIONS} placeholder="Select category" className="flex-1" />
                  <Button type="button" variant="outline" size="icon" onClick={() => setInlineCreate(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tax</Label>
                <Select options={TAX_OPTIONS} placeholder="Select tax rate" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Unit of measure</Label>
              <Input placeholder="piece, kg, litre…" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Optional description" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="showOnKds" defaultChecked className="h-5 w-5 rounded border-neo border-cafe-text accent-coral" />
              <Label htmlFor="showOnKds">Show on KDS</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Discard</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inline create category */}
      <InlineCreateModal
        open={inlineCreate}
        onOpenChange={setInlineCreate}
        title="New category"
        onSubmit={() => setInlineCreate(false)}
      >
        <div className="space-y-2">
          <Label>Name</Label>
          <Input placeholder="Category name" required />
        </div>
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex gap-2 flex-wrap">
            {['#D97706', '#DC2626', '#2563EB', '#16A34A', '#9333EA', '#EC4899', '#F97316', '#0EA5E9'].map((c) => (
              <button key={c} type="button" className="h-8 w-8 rounded-full border-neo border-cafe-text shadow-neo-sm hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </InlineCreateModal>
    </>
  );
}
