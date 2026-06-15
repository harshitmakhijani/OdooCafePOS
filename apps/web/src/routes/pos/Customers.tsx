import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useCartStore } from '@/stores/cart.store';
import { Plus, Edit2, Trash2, Search, ArrowLeft, Check } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface CustomerResponse {
  data: Customer[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function Customers() {
  const navigate = useNavigate();
  const cartOrderId = useCartStore((s) => s.orderId);
  const cartCustomerId = useCartStore((s) => s.customerId);
  const setCustomer = useCartStore((s) => s.setCustomer);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Modals state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<CustomerResponse>('/customers', {
        params: {
          page,
          pageSize: 10,
          search: search || undefined,
        },
      });
      const data = res.data;
      setCustomers(data.data);
      setTotalPages(data.meta?.totalPages ?? 1);
    } catch (err) {
      setError('Failed to fetch customers list. Check connection.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenCreate = () => {
    setModalType('create');
    setActiveCustomerId(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setModalType('edit');
    setActiveCustomerId(customer.id);
    setFormName(customer.name);
    setFormEmail(customer.email || '');
    setFormPhone(customer.phone || '');
    setFormError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      const payload = {
        name: formName,
        email: formEmail || undefined,
        phone: formPhone || undefined,
      };

      if (modalType === 'create') {
        await api.post('/customers', payload);
      } else {
        await api.patch(`/customers/${activeCustomerId}`, payload);
      }
      
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Failed to save customer.';
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"?`)) return;
    setError(null);
    try {
      await api.delete(`/customers/${id}`);
      fetchCustomers();
    } catch (err) {
      setError('Failed to delete customer.');
    }
  };

  const handleAssignToOrder = async (customer: Customer) => {
    // Save in Zustand
    setCustomer(customer.id);

    // If an active order exists, update it on the backend immediately (PRD §9.9)
    if (cartOrderId) {
      try {
        // Fetch order details first to get current version
        const orderRes = await api.get(`/orders/${cartOrderId}`);
        const orderData = orderRes.data?.data ?? orderRes.data;
        
        await api.patch(`/orders/${cartOrderId}`, {
          customerId: customer.id,
          version: orderData.version,
        });
      } catch (err) {
        // Silent error, Zustand will be matched on save
      }
    }
    
    // Redirect back to POS order view
    navigate('/pos/order');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b-2 border-black pb-4">
        <div className="flex items-center gap-3">
          {cartOrderId && (
            <button
              onClick={() => navigate('/pos/order')}
              className="nb-button bg-white p-2.5"
              title="Back to Order"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-extrabold text-black">Customers</h1>
            <p className="text-xs text-neutral-600 font-bold mt-1">
              {cartOrderId ? 'Assign a customer to the active order.' : 'Manage customer accounts.'}
            </p>
          </div>
        </div>

        <button onClick={handleOpenCreate} className="nb-button-primary px-4 py-2 text-sm uppercase tracking-wider flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {error && (
        <div className="p-4 border-2 border-black bg-red-100 rounded-lg font-bold text-red-700 shadow-neubrutal-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          placeholder="Search by name, email, or phone number..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full nb-input !pl-10 py-3"
        />
      </div>

      {/* Customer Table */}
      {loading ? (
        <div className="flex h-[40vh] flex-col items-center justify-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-neubrutal-coral"></div>
          <p className="font-bold text-black uppercase tracking-wider text-xs">Fetching customer list...</p>
        </div>
      ) : (
        <div className="nb-card bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-bold text-black text-left">
              <thead className="bg-neubrutal-cream/40 border-b-2 border-black text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 w-12 text-center">Avatar</th>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {customers.map((customer) => {
                  const isAssigned = cartCustomerId === customer.id;

                  return (
                    <tr key={customer.id} className="hover:bg-neutral-50">
                      <td className="p-4 text-center">
                        <div className="h-9 w-9 rounded-full border-2 border-black bg-neubrutal-lavender flex items-center justify-center font-bold">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                      </td>
                      <td className="p-4 font-extrabold text-black">
                        {customer.name}
                        {isAssigned && (
                          <span className="ml-2 nb-badge bg-neubrutal-lime text-black text-[9px] uppercase px-1.5 py-0">
                            Active Cart
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-xs">{customer.email || '—'}</td>
                      <td className="p-4 font-mono text-xs">{customer.phone || '—'}</td>
                      <td className="p-4 text-right space-x-2">
                        {cartOrderId && (
                          <button
                            onClick={() => handleAssignToOrder(customer)}
                            className={`nb-button text-xs py-1 px-3 uppercase tracking-wider gap-1.5 ${
                              isAssigned
                                ? 'bg-neubrutal-lime border-2 border-black text-black'
                                : 'bg-white hover:bg-neutral-100'
                            }`}
                          >
                            {isAssigned ? <Check className="h-3.5 w-3.5" /> : null}
                            <span>{isAssigned ? 'Linked' : 'Link Order'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(customer)}
                          className="nb-button bg-white text-black p-2.5"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id, customer.name)}
                          className="nb-button-destructive p-2.5 text-white"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {customers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-neutral-500 font-bold">
                      No customer records found matching search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t-2 border-black bg-neubrutal-cream/10 flex justify-between items-center">
              <span className="text-xs text-neutral-600 font-bold">
                Showing Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="nb-button bg-white text-xs py-1 px-3"
                >
                  ◀ Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="nb-button bg-white text-xs py-1 px-3"
                >
                  Next ▶
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm nb-card bg-white p-6 space-y-6">
            <div className="border-b-2 border-black pb-3">
              <h3 className="text-xl font-extrabold text-black">
                {modalType === 'create' ? 'Add New Customer' : 'Edit Customer Details'}
              </h3>
              <p className="text-xs text-neutral-600 font-bold mt-0.5">
                All contact fields are optional except name.
              </p>
            </div>

            {formError && (
              <div className="p-3 border-2 border-black bg-red-100 rounded-lg text-xs font-bold text-red-700">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 font-bold">
              <div className="space-y-1">
                <label htmlFor="formName" className="text-xs uppercase tracking-wider text-black block">
                  Customer Name
                </label>
                <input
                  id="formName"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full nb-input"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="formEmail" className="text-xs uppercase tracking-wider text-black block">
                  Email Address
                </label>
                <input
                  id="formEmail"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full nb-input"
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="formPhone" className="text-xs uppercase tracking-wider text-black block">
                  Phone Number
                </label>
                <input
                  id="formPhone"
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full nb-input"
                  placeholder="9876543210"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 nb-button-secondary py-2.5 text-xs uppercase"
                  disabled={formLoading}
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 nb-button-primary py-2.5 text-xs uppercase"
                  disabled={formLoading}
                >
                  {formLoading ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
