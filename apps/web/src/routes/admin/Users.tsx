import { useState, useEffect } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';
import { FormShell } from '@/components/shells/FormShell';
import { InlineCreateModal } from '@/components/shells/InlineCreateModal';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { Role, UserStatus } from '@cafe-pos/types';
import { KeyRound } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation / View states
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // User Form fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formRole, setFormRole] = useState<Role>(Role.CASHIER);
  const [submitting, setSubmitting] = useState(false);

  // Change Password popup states
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [formPassword, setFormPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ data: User[] }>('/users');
      setUsers(res.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleNew = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormUsername('');
    setFormRole(Role.CASHIER);
    setView('form');
  };

  const handleRowClick = (row: User) => {
    setEditingUser(row);
    setFormName(row.name);
    setFormEmail(row.email);
    setFormUsername(row.username);
    setFormRole(row.role);
    setView('form');
  };

  const handleUserSubmit = async () => {
    if (!formName.trim() || !formEmail.trim() || !formUsername.trim()) return;
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name: formName.trim(),
        email: formEmail.trim(),
        username: formUsername.trim(),
        role: formRole,
      };

      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, payload);
      } else {
        await api.post('/users', payload);
      }

      setView('list');
      fetchUsers();
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Failed to save user account.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (!window.confirm(`Are you sure you want to delete/archive ${ids.length} users?`)) return;
    try {
      setError(null);
      await Promise.all(ids.map((id) => api.delete(`/users/${id}`)));
      fetchUsers();
    } catch (err) {
      console.error(err);
      setError('Failed to delete selected users.');
    }
  };

  // Archive (deactivate) toggler
  const handleToggleArchive = async () => {
    if (!editingUser) return;
    const actionWord = editingUser.status === UserStatus.ACTIVE ? 'archive' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionWord} this user?`)) return;
    try {
      setSubmitting(true);
      await api.patch(`/users/${editingUser.id}/archive`);
      setView('list');
      fetchUsers();
    } catch (err) {
      console.error(err);
      setError('Failed to change user status.');
    } finally {
      setSubmitting(false);
    }
  };

  // Password mutation submitter
  const handlePasswordSubmit = async () => {
    if (!editingUser || formPassword.length < 8) return;
    try {
      setPasswordSubmitting(true);
      await api.patch(`/users/${editingUser.id}/password`, {
        password: formPassword,
      });
      setPasswordOpen(false);
      setFormPassword('');
      alert('Password updated successfully.');
    } catch (err) {
      console.error(err);
      alert(getApiErrorMessage(err, 'Failed to update password.'));
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // Client side search filter
  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const columns: ListColumn<User>[] = [
    { key: 'name', header: 'Name', className: 'font-black text-black' },
    { key: 'username', header: 'Username', className: 'font-mono text-xs' },
    { key: 'email', header: 'Email Address' },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <span className="nb-badge bg-white text-black font-extrabold uppercase text-xs">
          {row.role}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className={`nb-badge text-[10px] uppercase font-black ${
          row.status === UserStatus.ACTIVE ? 'bg-neubrutal-lime text-black' : 'bg-neutral-100 text-neutral-500'
        }`}>
          {row.status}
        </span>
      ),
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
          title={editingUser ? `Edit User: ${editingUser.username}` : 'New User Account'}
          onSubmit={handleUserSubmit}
          onDiscard={() => setView('list')}
          isSubmitting={submitting}
          submitLabel={editingUser ? 'Save Account' : 'Create Account'}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Full Name</label>
              <input
                type="text"
                required
                className="nb-input w-full font-bold"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Harshit Joshi"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Username</label>
              <input
                type="text"
                required
                className="nb-input w-full font-mono font-bold"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="e.g. harshit_joshi"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Email Address</label>
              <input
                type="email"
                required
                className="nb-input w-full font-bold"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="e.g. harshit@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">Access Role</label>
              <select
                className="nb-input w-full font-bold"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as Role)}
              >
                <option value={Role.CASHIER}>CASHIER (POS Terminal)</option>
                <option value={Role.KITCHEN}>KITCHEN (KDS prep display)</option>
                <option value={Role.ADMIN}>ADMINISTRATOR (Full Access)</option>
              </select>
            </div>

            {editingUser && (
              <div className="flex flex-col gap-2 pt-6">
                <label className="block text-xs font-black uppercase text-black">Security & Status Controls</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPasswordOpen(true)}
                    className="nb-button-white text-xs uppercase font-extrabold flex items-center justify-center gap-1.5 flex-1"
                  >
                    <KeyRound className="h-4 w-4" /> Change Password
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleArchive}
                    className="nb-button-secondary text-xs uppercase font-extrabold text-center flex-1"
                  >
                    {editingUser.status === UserStatus.ACTIVE ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </FormShell>

        {/* Change Password Inline Modal */}
        {editingUser && (
          <InlineCreateModal
            open={passwordOpen}
            onOpenChange={setPasswordOpen}
            title="Change User Password"
            description={`Enter a new secure password for user account: ${editingUser.username}.`}
            onSubmit={handlePasswordSubmit}
            isSubmitting={passwordSubmitting}
            submitLabel="Update Password"
          >
            <div>
              <label className="block text-xs font-black uppercase mb-1.5 text-black">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="nb-input w-full font-bold"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </div>
          </InlineCreateModal>
        )}
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

      <ListShell<User>
        title="User Accounts"
        rows={filteredUsers}
        columns={columns}
        getRowId={(u) => u.id}
        searchValue={search}
        onSearchChange={setSearch}
        newLabel="New Account"
        onNew={handleNew}
        onRowClick={handleRowClick}
        onBulkDelete={handleBulkDelete}
        isLoading={loading}
        emptyMessage="No user accounts created yet."
      />
    </div>
  );
}
