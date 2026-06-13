import { useState, type FormEvent } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  color: string;
}

const COLORS = ['#D97706', '#DC2626', '#2563EB', '#16A34A', '#9333EA', '#EC4899', '#F97316', '#0EA5E9', '#6366F1', '#14B8A6'];

const MOCK: Category[] = [
  { id: 'c1', name: 'Hot Drinks', color: '#D97706' },
  { id: 'c2', name: 'Cold Drinks', color: '#2563EB' },
  { id: 'c3', name: 'Snacks', color: '#DC2626' },
  { id: 'c4', name: 'Main Course', color: '#16A34A' },
  { id: 'c5', name: 'Desserts', color: '#9333EA' },
];

const columns: ListColumn<Category>[] = [
  { key: 'name', header: 'Name', render: (r) => <span className="font-semibold">{r.name}</span> },
  {
    key: 'color',
    header: 'Color',
    render: (r) => (
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 rounded-full border-[1.5px] border-cafe-text" style={{ backgroundColor: r.color }} />
        <span className="text-xs text-cafe-text-muted font-mono">{r.color}</span>
      </div>
    ),
  },
];

/** Admin Categories CRUD (PRD §8.3). */
export function Categories() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', color: COLORS[0] });
  const [saving, setSaving] = useState(false);

  const filtered = MOCK.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openNew = () => { setEditing(null); setForm({ name: '', color: COLORS[0] }); setModalOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, color: c.color }); setModalOpen(true); };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => { setModalOpen(false); setSaving(false); }, 300);
  };

  return (
    <>
      <ListShell
        title="Categories"
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchValue={search}
        onSearchChange={setSearch}
        onNew={openNew}
        newLabel="New category"
        emptyMessage="No categories yet. Create your first one."
        onBulkDelete={(ids) => console.log('delete', ids)}
        rowActions={(row) => (
          <>
            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="text-cancelled">
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit category' : 'New category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, color: c }))}
                    className={cn(
                      'h-9 w-9 rounded-full border-[2.5px] transition-all',
                      form.color === c
                        ? 'border-cafe-text scale-110 shadow-neo-sm'
                        : 'border-transparent hover:border-cafe-border hover:scale-105',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Discard</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
