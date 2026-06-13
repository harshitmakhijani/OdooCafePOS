import { useState, type FormEvent } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, Trash2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

const MOCK: Customer[] = [
  { id: 'c1', name: 'Rahul Mehta', email: 'rahul@email.com', phone: '+91 98765 43210' },
  { id: 'c2', name: 'Priya Sharma', email: 'priya@email.com', phone: '+91 87654 32109' },
  { id: 'c3', name: 'Amit Kumar', email: 'amit.k@email.com', phone: '+91 76543 21098' },
  { id: 'c4', name: 'Sneha Patel', email: 'sneha@email.com', phone: '+91 65432 10987' },
];

const columns: ListColumn<Customer>[] = [
  { key: 'name', header: 'Name', render: (r) => <span className="font-semibold">{r.name}</span> },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
];

/** Customer management — list, create, edit, delete (PRD §9.9). */
export function Customers() {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState(MOCK);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search),
  );

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '' });
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email, phone: c.phone });
    setModalOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      if (editing) {
        setCustomers((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...form } : c)));
      } else {
        setCustomers((prev) => [...prev, { id: `c-${Date.now()}`, ...form }]);
      }
      setModalOpen(false);
      setSaving(false);
    }, 300);
  };

  const handleDelete = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <>
      <ListShell
        title="Customers"
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchValue={search}
        onSearchChange={setSearch}
        onNew={openNew}
        newLabel="New customer"
        emptyMessage="No customers yet. Create your first one."
        rowActions={(row) => (
          <>
            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="text-cancelled" onClick={() => handleDelete(row.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit customer' : 'New customer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cust-name">Name</Label>
              <Input id="cust-name" value={form.name} onChange={set('name')} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-email">Email</Label>
              <Input id="cust-email" type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-phone">Phone</Label>
              <Input id="cust-phone" value={form.phone} onChange={set('phone')} />
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
