import { useState, useEffect } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';
import { FormShell } from '@/components/shells/FormShell';
import { api } from '@/lib/api';
import { BookingStatus } from '@cafe-pos/types';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface Table {
  id: string;
  tableNumber: number;
  seats: number;
  floor: { name: string };
}

interface Booking {
  id: string;
  customerId: string | null;
  customer?: Customer | null;
  guestName: string | null;
  guestPhone: string | null;
  tableId: string;
  table: Table;
  reservedAt: string;
  partySize: number;
  status: BookingStatus;
  notes: string | null;
}

export function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Navigation / View states
  const [view, setView] = useState<'list' | 'form'>('list');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states (Booking)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formGuestName, setFormGuestName] = useState('');
  const [formGuestPhone, setFormGuestPhone] = useState('');
  const [formTableId, setFormTableId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formPartySize, setFormPartySize] = useState('2');
  const [formStatus, setFormStatus] = useState<BookingStatus>(BookingStatus.BOOKED);
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [bookingsRes, tablesRes, customersRes] = await Promise.all([
        api.get<{ data: Booking[] }>('/bookings'),
        // Tables list doesn't have a direct query but we can get floors (which include tables)
        api.get('/floors'),
        api.get<{ data: Customer[] }>('/customers'),
      ]);
      setBookings(bookingsRes.data.data);
      setCustomers(customersRes.data.data);
      
      // Extract tables from floor layout
      const floors = tablesRes.data.data || [];
      const extractedTables: Table[] = [];
      floors.forEach((f: any) => {
        if (f.tables) {
          f.tables.forEach((t: any) => {
            extractedTables.push({
              id: t.id,
              tableNumber: t.tableNumber,
              seats: t.seats,
              floor: { name: f.name },
            });
          });
        }
      });
      setTables(extractedTables);
    } catch (err) {
      console.error(err);
      setError('Failed to load reservation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleNew = () => {
    setEditingBooking(null);
    setIsGuest(true);
    setFormCustomerId('');
    setFormGuestName('');
    setFormGuestPhone('');
    setFormTableId(tables[0]?.id || '');
    
    // Set default date to today and time to next hour
    const today = new Date();
    setFormDate(today.toISOString().split('T')[0]);
    
    const nextHour = new Date(today);
    nextHour.setHours(today.getHours() + 1, 0, 0, 0);
    setFormTime(nextHour.toTimeString().slice(0, 5));
    
    setFormPartySize('2');
    setFormStatus(BookingStatus.BOOKED);
    setFormNotes('');
    setView('form');
  };

  const handleRowClick = (row: Booking) => {
    setEditingBooking(row);
    
    if (row.customerId) {
      setIsGuest(false);
      setFormCustomerId(row.customerId);
    } else {
      setIsGuest(true);
      setFormGuestName(row.guestName || '');
      setFormGuestPhone(row.guestPhone || '');
    }

    setFormTableId(row.tableId);
    
    const dateObj = new Date(row.reservedAt);
    setFormDate(dateObj.toISOString().split('T')[0]);
    setFormTime(dateObj.toTimeString().slice(0, 5));
    
    setFormPartySize(String(row.partySize));
    setFormStatus(row.status);
    setFormNotes(row.notes || '');
    setView('form');
  };

  const handleBookingSubmit = async () => {
    if (!formTableId || !formDate || !formTime || !formPartySize) return;

    if (isGuest && !formGuestName.trim()) {
      alert('Guest name is required.');
      return;
    }
    if (!isGuest && !formCustomerId) {
      alert('Please select a customer.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Combine Date + Time into ISO timestamp
      const reservedAt = new Date(`${formDate}T${formTime}:00`).toISOString();

      const payload = {
        customerId: isGuest ? null : formCustomerId,
        guestName: isGuest ? formGuestName.trim() : null,
        guestPhone: isGuest ? formGuestPhone.trim() : null,
        tableId: formTableId,
        reservedAt,
        partySize: parseInt(formPartySize),
        status: formStatus,
        notes: formNotes.trim() || undefined,
      };

      if (editingBooking) {
        await api.patch(`/bookings/${editingBooking.id}`, payload);
      } else {
        await api.post('/bookings', payload);
      }

      setView('list');
      fetchInitialData();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to save booking. Check for time overlap.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (ids: string[]) => {
    if (!window.confirm(`Are you sure you want to cancel ${ids.length} reservations?`)) return;
    try {
      setError(null);
      await Promise.all(ids.map((id) => api.delete(`/bookings/${id}`)));
      fetchInitialData();
    } catch (err: any) {
      console.error(err);
      setError('Failed to cancel selected bookings.');
    }
  };

  // Client side search filter (matches guest/customer name, phone, or table number)
  const filteredBookings = bookings.filter((b) => {
    const name = b.customer ? b.customer.name : b.guestName || '';
    const phone = b.customer ? b.customer.phone || '' : b.guestPhone || '';
    const matchSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      phone.includes(search) ||
      `table ${b.table?.tableNumber}`.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const columns: ListColumn<Booking>[] = [
    {
      key: 'customer',
      header: 'Guest / Customer',
      render: (row) => {
        const name = row.customer ? row.customer.name : `${row.guestName} (Guest)`;
        const phone = row.customer ? row.customer.phone : row.guestPhone;
        return (
          <div>
            <div className="font-black text-black">{name}</div>
            <div className="text-xs text-neutral-600 font-mono">{phone || 'No phone'}</div>
          </div>
        );
      },
    },
    {
      key: 'table',
      header: 'Table Assignment',
      render: (row) => (
        <div>
          <span className="font-bold text-black">Table {row.table?.tableNumber}</span>
          <span className="text-xs text-neutral-500 font-bold block">
            {row.table?.floor?.name || 'Main Floor'} ({row.table?.seats} Seats)
          </span>
        </div>
      ),
    },
    {
      key: 'reservedAt',
      header: 'Date & Time',
      render: (row) => {
        const dateObj = new Date(row.reservedAt);
        return (
          <span className="font-mono text-xs text-black">
            {dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
            {dateObj.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
    },
    {
      key: 'partySize',
      header: 'Guests',
      render: (row) => <span className="font-mono text-center font-bold text-black">{row.partySize} Pax</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        let style = 'bg-neutral-100 text-neutral-500';
        if (row.status === BookingStatus.BOOKED) style = 'bg-neubrutal-lavender text-black';
        else if (row.status === BookingStatus.SEATED) style = 'bg-neubrutal-lime text-black';
        else if (row.status === BookingStatus.CANCELLED) style = 'bg-neubrutal-coral/20 text-neutral-600';
        return (
          <span className={`nb-badge text-[10px] uppercase font-black ${style}`}>
            {row.status}
          </span>
        );
      },
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
          title={editingBooking ? 'Edit Booking' : 'New Booking'}
          onSubmit={handleBookingSubmit}
          onDiscard={() => setView('list')}
          isSubmitting={submitting}
          submitLabel={editingBooking ? 'Save Booking' : 'Create Booking'}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer profiling picker */}
            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Booking Mode</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsGuest(true)}
                  className={`flex-1 py-2 text-xs uppercase font-extrabold nb-card text-center ${
                    isGuest ? 'bg-neubrutal-coral text-white' : 'bg-white text-black hover:bg-neutral-50'
                  }`}
                >
                  Guest Info
                </button>
                <button
                  type="button"
                  onClick={() => setIsGuest(false)}
                  className={`flex-1 py-2 text-xs uppercase font-extrabold nb-card text-center ${
                    !isGuest ? 'bg-neubrutal-coral text-white' : 'bg-white text-black hover:bg-neutral-50'
                  }`}
                >
                  Saved Customer
                </button>
              </div>
            </div>

            {isGuest ? (
              <>
                <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="block text-xs font-black uppercase mb-1.5 text-black">Guest Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    className="nb-input w-full font-bold"
                    value={formGuestName}
                    onChange={(e) => setFormGuestName(e.target.value)}
                  />
                </div>
                <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="block text-xs font-black uppercase mb-1.5 text-black">Guest Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9988776655"
                    className="nb-input w-full font-bold"
                    value={formGuestPhone}
                    onChange={(e) => setFormGuestPhone(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="md:col-span-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <label className="block text-xs font-black uppercase mb-1.5 text-black">Select Customer</label>
                <select
                  required
                  className="nb-input w-full font-bold"
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                >
                  <option value="" disabled>Choose customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || 'No phone'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Table assignment */}
            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Assign Table</label>
              <select
                required
                className="nb-input w-full font-bold"
                value={formTableId}
                onChange={(e) => setFormTableId(e.target.value)}
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.tableNumber} - {t.floor.name} ({t.seats} seats)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Party Size (Guests)</label>
              <input
                type="number"
                min="1"
                required
                className="nb-input w-full font-bold"
                value={formPartySize}
                onChange={(e) => setFormPartySize(e.target.value)}
              />
            </div>

            {/* Date & Time parameters */}
            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Reservation Date</label>
              <input
                type="date"
                required
                className="nb-input w-full font-bold font-mono"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Reservation Time</label>
              <input
                type="time"
                required
                className="nb-input w-full font-bold font-mono"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
              />
            </div>

            {/* Status updates */}
            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Reservation Status</label>
              <select
                className="nb-input w-full font-bold"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as BookingStatus)}
              >
                <option value={BookingStatus.BOOKED}>BOOKED</option>
                <option value={BookingStatus.SEATED}>SEATED (Checked-In)</option>
                <option value={BookingStatus.CANCELLED}>CANCELLED</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Reservation Notes</label>
              <textarea
                className="nb-input w-full font-bold min-h-[80px]"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Specific table preference or food restrictions..."
              />
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

      <ListShell<Booking>
        title="Reservations"
        rows={filteredBookings}
        columns={columns}
        getRowId={(b) => b.id}
        searchValue={search}
        onSearchChange={setSearch}
        newLabel="New Booking"
        onNew={handleNew}
        onRowClick={handleRowClick}
        onBulkDelete={handleCancelBooking}
        isLoading={loading}
        emptyMessage="No reservations booked yet."
      />
    </div>
  );
}
