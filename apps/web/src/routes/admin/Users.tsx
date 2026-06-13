import { useState } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';
import { StatusPill } from '@/components/ui/status-pill';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, Trash2, KeyRound, Archive } from 'lucide-react';

interface User {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'archived';
  email: string;
}

const MOCK: User[] = [
  { id: 'u1', name: 'Admin User', role: 'ADMIN', status: 'active', email: 'admin@cafe.com' },
  { id: 'u2', name: 'Cashier One', role: 'CASHIER', status: 'active', email: 'cashier1@cafe.com' },
  { id: 'u3', name: 'Kitchen Staff', role: 'KITCHEN', status: 'active', email: 'kitchen@cafe.com' },
  { id: 'u4', name: 'Old Employee', role: 'CASHIER', status: 'archived', email: 'old@cafe.com' },
];

const columns: ListColumn<User>[] = [
  { key: 'name', header: 'Name', render: (r) => <span className="font-semibold">{r.name}</span> },
  { key: 'role', header: 'Role', render: (r) => <Badge variant="secondary">{r.role}</Badge> },
  {
    key: 'status', header: 'Status',
    render: (r) => <StatusPill variant={r.status === 'active' ? 'paid' : 'cancelled'} label={r.status === 'active' ? 'Active' : 'Archived'} />,
  },
];

/** Admin Users/Employees (PRD §8.7). */
export function Users() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [pwdModal, setPwdModal] = useState(false);

  const filtered = MOCK.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <ListShell
        title="Users & Employees"
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchValue={search}
        onSearchChange={setSearch}
        onNew={() => setModalOpen(true)}
        newLabel="New user"
        emptyMessage="No users found."
        rowActions={() => (
          <>
            <Button variant="ghost" size="icon-sm" title="Change password" onClick={() => setPwdModal(true)}>
              <KeyRound className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Archive">
              <Archive className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="text-cancelled" title="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      />

      {/* Create user modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New user</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); setModalOpen(false); }} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input required /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" required /></div>
            <div className="space-y-2"><Label>Username</Label><Input required /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select options={[{ value: 'ADMIN', label: 'Admin' }, { value: 'CASHIER', label: 'Cashier' }, { value: 'KITCHEN', label: 'Kitchen' }]} />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Discard</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change password modal */}
      <Dialog open={pwdModal} onOpenChange={setPwdModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change password</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); setPwdModal(false); }} className="space-y-4">
            <div className="space-y-2"><Label>New password</Label><Input type="password" required /></div>
            <div className="space-y-2"><Label>Confirm password</Label><Input type="password" required /></div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setPwdModal(false)}>Cancel</Button>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
