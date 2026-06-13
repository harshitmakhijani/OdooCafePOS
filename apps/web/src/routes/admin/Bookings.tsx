import { useState } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, Trash2 } from 'lucide-react';

interface Booking {
  id: string;
  customer: string;
  table: string;
  dateTime: string;
  partySize: number;
  status: 'booked' | 'seated' | 'cancelled';
}

const MOCK: Booking[] = [
  { id: 'b1', customer: 'Rahul Mehta', table: 'Table 4 (GF)', dateTime: 'Jun 14, 7:00 PM', partySize: 4, status: 'booked' },
  { id: 'b2', customer: 'Priya Sharma', table: 'Table 10 (Terrace)', dateTime: 'Jun 14, 8:30 PM', partySize: 6, status: 'booked' },
  { id: 'b3', customer: 'Walk-in Guest', table: 'Table 2 (GF)', dateTime: 'Jun 13, 1:00 PM', partySize: 2, status: 'seated' },
  { id: 'b4', customer: 'Amit Kumar', table: 'Table 7 (1F)', dateTime: 'Jun 12, 7:00 PM', partySize: 8, status: 'cancelled' },
];

const statusMap = { booked: 'info', seated: 'paid', cancelled: 'cancelled' } as const;

const columns: ListColumn<Booking>[] = [
  { key: 'customer', header: 'Customer', render: (r) => <span className="font-semibold">{r.customer}</span> },
  { key: 'table', header: 'Table' },
  { key: 'dateTime', header: 'Date & Time' },
  { key: 'partySize', header: 'Party', numeric: true },
  { key: 'status', header: 'Status', render: (r) => <StatusPill variant={statusMap[r.status]} label={r.status.charAt(0).toUpperCase() + r.status.slice(1)} /> },
];

/** Admin Bookings — table reservations (PRD §8.8). */
export function Bookings() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = MOCK.filter((b) => b.customer.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <ListShell
        title="Bookings"
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchValue={search}
        onSearchChange={setSearch}
        onNew={() => setModalOpen(true)}
        newLabel="New booking"
        emptyMessage="No bookings yet."
        rowActions={() => (
          <>
            <Button variant="ghost" size="icon-sm"><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon-sm" className="text-cancelled"><Trash2 className="h-4 w-4" /></Button>
          </>
        )}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New booking</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); setModalOpen(false); }} className="space-y-4">
            <div className="space-y-2"><Label>Customer name</Label><Input placeholder="Guest name" required /></div>
            <div className="space-y-2"><Label>Phone</Label><Input placeholder="+91 98765 43210" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Floor</Label>
                <Select options={[{ value: 'f1', label: 'Ground Floor' }, { value: 'f2', label: '1st Floor' }, { value: 'f3', label: 'Terrace' }]} />
              </div>
              <div className="space-y-2">
                <Label>Table</Label>
                <Select options={[{ value: 't4', label: 'Table 4' }, { value: 't7', label: 'Table 7' }, { value: 't10', label: 'Table 10' }]} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date & time</Label><Input type="datetime-local" required /></div>
              <div className="space-y-2"><Label>Party size</Label><Input type="number" placeholder="2" required /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input placeholder="Special requests…" /></div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Discard</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
