import { useState, type FormEvent } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, Trash2 } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  active: boolean;
  upiId?: string;
}

const MOCK: PaymentMethod[] = [
  { id: 'pm1', name: 'Cash', type: 'CASH', active: true },
  { id: 'pm2', name: 'Card (Razorpay)', type: 'CARD', active: true },
  { id: 'pm3', name: 'UPI (Razorpay)', type: 'UPI', active: true, upiId: 'cafe@upi' },
];

const columns: ListColumn<PaymentMethod>[] = [
  { key: 'name', header: 'Name', render: (r) => <span className="font-semibold">{r.name}</span> },
  { key: 'type', header: 'Type', render: (r) => <Badge variant="secondary">{r.type}</Badge> },
  {
    key: 'active', header: 'Status',
    render: (r) => (
      <span className={`neo-pill text-[10px] ${r.active ? 'neo-pill-paid' : 'neo-pill-cancelled'}`}>
        {r.active ? 'Active' : 'Inactive'}
      </span>
    ),
  },
];

/** Admin Payment Methods (PRD §8.4). */
export function PaymentMethods() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState('CASH');
  const [saving, setSaving] = useState(false);

  const filtered = MOCK.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => { setModalOpen(false); setSaving(false); }, 300);
  };

  return (
    <>
      <ListShell
        title="Payment methods"
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchValue={search}
        onSearchChange={setSearch}
        onNew={() => setModalOpen(true)}
        newLabel="New method"
        emptyMessage="No payment methods configured."
        rowActions={() => (
          <>
            <Button variant="ghost" size="icon-sm"><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon-sm" className="text-cancelled"><Trash2 className="h-4 w-4" /></Button>
          </>
        )}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New payment method</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="e.g. Cash, Card, UPI" required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                options={[
                  { value: 'CASH', label: 'Cash' },
                  { value: 'CARD', label: 'Card' },
                  { value: 'UPI', label: 'UPI' },
                ]}
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
            </div>
            {type === 'UPI' && (
              <div className="space-y-2">
                <Label>UPI ID</Label>
                <Input placeholder="cafe@upi" required />
              </div>
            )}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="pm-active" defaultChecked className="h-5 w-5 rounded border-neo border-cafe-text accent-coral" />
              <Label htmlFor="pm-active">Active</Label>
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
