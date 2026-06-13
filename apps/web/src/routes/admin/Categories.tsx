import { useState } from 'react';
import { ListShell, type ListColumn } from '@/components/shells/ListShell';

interface CategoryRow {
  id: string;
  name: string;
  color: string;
}

/**
 * Admin Categories (PRD §8.3 / §13.3). Demonstrates the reusable ListShell
 * wired to props — data fetching (TanStack Query → GET /categories) is added
 * during feature work. TODO(PRD §13.3).
 */
export function Categories() {
  const [search, setSearch] = useState('');
  const rows: CategoryRow[] = []; // TODO(PRD §13.3): fetch from GET /categories

  const columns: ListColumn<CategoryRow>[] = [
    { key: 'name', header: 'Name' },
    {
      key: 'color',
      header: 'Color',
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: row.color }} />
          {row.color}
        </span>
      ),
    },
  ];

  return (
    <ListShell<CategoryRow>
      title="Categories"
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchValue={search}
      onSearchChange={setSearch}
      newLabel="New Category"
      onNew={() => undefined}
      emptyMessage="No categories yet — scaffold placeholder (TODO PRD §13.3)."
    />
  );
}
