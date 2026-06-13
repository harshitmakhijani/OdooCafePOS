import { useState, useEffect } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';
import { InlineCreateModal } from '@/components/shells/InlineCreateModal';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { PaymentType } from '@cafe-pos/types';

interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentType;
  upiId: string | null;
  active: boolean;
}

export function PaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog & Form states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<PaymentType>(PaymentType.CASH);
  const [formUpiId, setFormUpiId] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ data: PaymentMethod[] }>('/payment-methods');
      setMethods(res.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load payment methods.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const handleNew = () => {
    setEditingMethod(null);
    setFormName('');
    setFormType(PaymentType.CASH);
    setFormUpiId('');
    setFormActive(true);
    setDialogOpen(true);
  };

  const handleRowClick = (row: PaymentMethod) => {
    setEditingMethod(row);
    setFormName(row.name);
    setFormType(row.type);
    setFormUpiId(row.upiId || '');
    setFormActive(row.active);
    setDialogOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formName.trim()) return;
    if (formType === PaymentType.UPI && !formUpiId.trim()) {
      alert('UPI ID is required for UPI payments.');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name: formName.trim(),
        type: formType,
        upiId: formType === PaymentType.UPI ? formUpiId.trim() : undefined,
        active: formActive,
      };

      if (editingMethod) {
        await api.patch(`/payment-methods/${editingMethod.id}`, payload);
      } else {
        await api.post('/payment-methods', payload);
      }

      setDialogOpen(false);
      fetchMethods();
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Failed to save payment method.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (!window.confirm(`Are you sure you want to delete ${ids.length} payment methods?`)) return;
    try {
      setError(null);
      await Promise.all(ids.map((id) => api.delete(`/payment-methods/${id}`)));
      fetchMethods();
    } catch (err) {
      console.error(err);
      setError('Failed to delete selected payment methods.');
    }
  };

  // Client side filter
  const filteredMethods = methods.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.type.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ListColumn<PaymentMethod>[] = [
    { key: 'name', header: 'Name', className: 'font-black text-black' },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="nb-badge bg-white text-black font-extrabold uppercase text-xs">
          {row.type}
        </span>
      ),
    },
    {
      key: 'upiId',
      header: 'UPI ID',
      render: (row) => <span className="font-mono text-xs text-neutral-600">{row.upiId || '—'}</span>,
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 border-2 border-black bg-red-100 rounded-lg font-bold text-red-700 shadow-neubrutal-sm">
          ⚠️ {error}
        </div>
      )}

      <ListShell<PaymentMethod>
        title="Payment Methods"
        rows={filteredMethods}
        columns={columns}
        getRowId={(m) => m.id}
        searchValue={search}
        onSearchChange={setSearch}
        newLabel="New Method"
        onNew={handleNew}
        onRowClick={handleRowClick}
        onBulkDelete={handleBulkDelete}
        isLoading={loading}
        emptyMessage="No payment methods configured yet."
      />

      <InlineCreateModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingMethod ? 'Edit Payment Method' : 'New Payment Method'}
        description={editingMethod ? 'Update details of this payment method.' : 'Configure a new customer payment method.'}
        onSubmit={handleFormSubmit}
        submitLabel={editingMethod ? 'Save Method' : 'Create Method'}
        isSubmitting={submitting}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase mb-1.5 text-black">
              Method Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Counter Cash or Razorpay Card"
              className="nb-input w-full font-bold"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase mb-1.5 text-black">
              Payment Type
            </label>
            <select
              className="nb-input w-full font-bold animate-in"
              value={formType}
              onChange={(e) => setFormType(e.target.value as PaymentType)}
            >
              <option value={PaymentType.CASH}>CASH</option>
              <option value={PaymentType.CARD}>CARD</option>
              <option value={PaymentType.UPI}>UPI</option>
            </select>
          </div>

          {formType === PaymentType.UPI && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="block text-xs font-black uppercase mb-1.5 text-black">
                UPI ID (Virtual Payment Address)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. merchant@upi"
                className="nb-input w-full font-mono font-bold"
                value={formUpiId}
                onChange={(e) => setFormUpiId(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center gap-3 bg-neutral-50 p-3.5 border-2 border-black rounded-lg">
            <input
              type="checkbox"
              id="activeMethod"
              className="border-2 border-black rounded-sm h-5 w-5 accent-neubrutal-coral cursor-pointer"
              checked={formActive}
              onChange={(e) => setFormActive(e.target.checked)}
            />
            <label htmlFor="activeMethod" className="text-xs font-black uppercase cursor-pointer select-none">
              Enabled (Available at Checkout)
            </label>
          </div>
        </div>
      </InlineCreateModal>
    </div>
  );
}
