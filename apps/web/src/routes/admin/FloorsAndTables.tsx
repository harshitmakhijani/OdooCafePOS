import { useState, type FormEvent } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface Floor { id: string; name: string; tableCount: number; }
interface Table { id: string; floorId: string; number: number; seats: number; active: boolean; }

const MOCK_FLOORS: Floor[] = [
  { id: 'f1', name: 'Ground Floor', tableCount: 6 },
  { id: 'f2', name: '1st Floor', tableCount: 3 },
  { id: 'f3', name: 'Terrace', tableCount: 3 },
];

const MOCK_TABLES: Table[] = [
  { id: 't1', floorId: 'f1', number: 1, seats: 4, active: true },
  { id: 't2', floorId: 'f1', number: 2, seats: 2, active: true },
  { id: 't3', floorId: 'f1', number: 3, seats: 4, active: true },
  { id: 't4', floorId: 'f1', number: 4, seats: 6, active: true },
  { id: 't5', floorId: 'f1', number: 5, seats: 2, active: false },
  { id: 't6', floorId: 'f1', number: 6, seats: 4, active: true },
  { id: 't7', floorId: 'f2', number: 7, seats: 8, active: true },
  { id: 't8', floorId: 'f2', number: 8, seats: 4, active: true },
  { id: 't9', floorId: 'f2', number: 9, seats: 2, active: true },
  { id: 't10', floorId: 'f3', number: 10, seats: 6, active: true },
  { id: 't11', floorId: 'f3', number: 11, seats: 4, active: true },
  { id: 't12', floorId: 'f3', number: 12, seats: 2, active: true },
];

const tableColumns: ListColumn<Table>[] = [
  { key: 'number', header: 'Number', render: (r) => <span className="font-bold">#{r.number}</span> },
  { key: 'seats', header: 'Seats', numeric: true },
  {
    key: 'active', header: 'Status',
    render: (r) => (
      <span className={`neo-pill text-[10px] ${r.active ? 'neo-pill-paid' : 'neo-pill-cancelled'}`}>
        {r.active ? 'Active' : 'Inactive'}
      </span>
    ),
  },
];

/** Admin Floors & Tables (PRD §8.6). */
export function FloorsAndTables() {
  const [selectedFloor, setSelectedFloor] = useState(MOCK_FLOORS[0].id);
  const [search, setSearch] = useState('');
  const [floorModal, setFloorModal] = useState(false);
  const [tableModal, setTableModal] = useState(false);

  const tables = MOCK_TABLES.filter(
    (t) => t.floorId === selectedFloor && String(t.number).includes(search),
  );

  return (
    <div className="space-y-6">
      {/* Floors section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-title font-bold text-cafe-text">Floors & Tables</h1>
          <Button size="sm" onClick={() => setFloorModal(true)}>
            <Plus className="h-4 w-4" /> New floor
          </Button>
        </div>
        <div className="flex gap-3 flex-wrap">
          {MOCK_FLOORS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFloor(f.id)}
              className={`neo-card-interactive px-5 py-3 text-center min-w-[140px] ${
                selectedFloor === f.id
                  ? '!bg-coral !text-coral-foreground !shadow-none !translate-x-[2px] !translate-y-[2px]'
                  : ''
              }`}
            >
              <p className="font-bold text-sm">{f.name}</p>
              <p className="text-xs mt-1 opacity-80">{f.tableCount} tables</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tables for selected floor */}
      <ListShell
        title={`Tables — ${MOCK_FLOORS.find((f) => f.id === selectedFloor)?.name}`}
        rows={tables}
        columns={tableColumns}
        getRowId={(r) => r.id}
        searchValue={search}
        onSearchChange={setSearch}
        onNew={() => setTableModal(true)}
        newLabel="New table"
        emptyMessage="No tables on this floor yet."
        rowActions={() => (
          <>
            <Button variant="ghost" size="icon-sm"><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon-sm" className="text-cancelled"><Trash2 className="h-4 w-4" /></Button>
          </>
        )}
      />

      {/* Floor create modal */}
      <Dialog open={floorModal} onOpenChange={setFloorModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New floor</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); setFloorModal(false); }} className="space-y-4">
            <div className="space-y-2"><Label>Floor name</Label><Input placeholder="e.g. Ground Floor" required /></div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setFloorModal(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Table create modal */}
      <Dialog open={tableModal} onOpenChange={setTableModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New table</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); setTableModal(false); }} className="space-y-4">
            <div className="space-y-2"><Label>Table number</Label><Input type="number" required /></div>
            <div className="space-y-2"><Label>Number of seats</Label><Input type="number" required /></div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="tbl-active" defaultChecked className="h-5 w-5 rounded border-neo border-cafe-text accent-coral" />
              <Label htmlFor="tbl-active">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setTableModal(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
