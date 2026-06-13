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

interface Promotion {
  id: string;
  name: string;
  type: 'COUPON' | 'AUTOMATED';
  condition: string;
  active: boolean;
}

const MOCK: Promotion[] = [
  { id: 'pr1', name: 'WELCOME10', type: 'COUPON', condition: '10% off', active: true },
  { id: 'pr2', name: 'Buy 3 Get 15% Off', type: 'AUTOMATED', condition: 'Min 3 items → 15% off', active: true },
  { id: 'pr3', name: 'FLAT50', type: 'COUPON', condition: '₹50 off', active: false },
  { id: 'pr4', name: 'Order ≥ ₹500', type: 'AUTOMATED', condition: 'Min ₹500 → 5% off', active: true },
];

const columns: ListColumn<Promotion>[] = [
  { key: 'name', header: 'Name', render: (r) => <span className="font-semibold">{r.name}</span> },
  { key: 'type', header: 'Type', render: (r) => <Badge variant={r.type === 'COUPON' ? 'default' : 'secondary'}>{r.type === 'COUPON' ? 'Coupon' : 'Automated'}</Badge> },
  { key: 'condition', header: 'Condition' },
  {
    key: 'active', header: 'Status',
    render: (r) => (
      <span className={`neo-pill text-[10px] ${r.active ? 'neo-pill-paid' : 'neo-pill-cancelled'}`}>
        {r.active ? 'Active' : 'Inactive'}
      </span>
    ),
  },
];

/** Admin Coupons & Promotions (PRD §8.5). */
export function Promotions() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [promoType, setPromoType] = useState<'COUPON' | 'AUTOMATED'>('COUPON');
  const [scope, setScope] = useState('ORDER');
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
        title="Coupons & Promotions"
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchValue={search}
        onSearchChange={setSearch}
        onNew={() => setModalOpen(true)}
        newLabel="New promotion"
        emptyMessage="No promotions yet. Create your first one."
        rowActions={() => (
          <>
            <Button variant="ghost" size="icon-sm"><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon-sm" className="text-cancelled"><Trash2 className="h-4 w-4" /></Button>
          </>
        )}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New promotion</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="Promotion name" required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                options={[{ value: 'COUPON', label: 'Coupon' }, { value: 'AUTOMATED', label: 'Automated' }]}
                value={promoType}
                onChange={(e) => setPromoType(e.target.value as 'COUPON' | 'AUTOMATED')}
              />
            </div>

            {promoType === 'COUPON' ? (
              <div className="space-y-2">
                <Label>Coupon code</Label>
                <Input placeholder="e.g. WELCOME10" required />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Apply scope</Label>
                  <Select
                    options={[{ value: 'ORDER', label: 'Order' }, { value: 'PRODUCT', label: 'Product' }]}
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                  />
                </div>
                {scope === 'PRODUCT' ? (
                  <div className="space-y-2">
                    <Label>Min quantity</Label>
                    <Input type="number" placeholder="e.g. 3" required />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Min order amount (₹)</Label>
                    <Input type="number" placeholder="e.g. 500" required />
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount type</Label>
                <Select options={[{ value: 'PERCENTAGE', label: 'Percentage (%)' }, { value: 'FIXED', label: 'Fixed (₹)' }]} />
              </div>
              <div className="space-y-2">
                <Label>Discount value</Label>
                <Input type="number" placeholder="e.g. 10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Optional description" />
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="promo-active" defaultChecked className="h-5 w-5 rounded border-neo border-cafe-text accent-coral" />
              <Label htmlFor="promo-active">Active</Label>
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
