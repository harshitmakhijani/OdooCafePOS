import { useMemo, useState, type ReactNode } from 'react';
import { Plus, Search, Trash2, Archive, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export interface ListColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  /** Right-align numeric columns. */
  numeric?: boolean;
}

export interface ListShellProps<T> {
  title: string;
  rows: T[];
  columns: ListColumn<T>[];
  getRowId: (row: T) => string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNew?: () => void;
  newLabel?: string;
  onRowClick?: (row: T) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkArchive?: (ids: string[]) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyMessage?: string;
  /** Row-level action buttons. */
  rowActions?: (row: T) => ReactNode;
}

/**
 * Reusable admin list view with Neubrutalism styling.
 * Implements loading (skeletons), empty (directive), and error (retry) states.
 */
export function ListShell<T>({
  title,
  rows,
  columns,
  getRowId,
  searchValue,
  onSearchChange,
  onNew,
  newLabel = 'New',
  onRowClick,
  onBulkDelete,
  onBulkArchive,
  isLoading = false,
  isError = false,
  onRetry,
  emptyMessage = 'No records yet. Create your first one.',
  rowActions,
}: ListShellProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allIds = useMemo(() => rows.map(getRowId), [rows, getRowId]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const selectedIds = [...selected];

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(allIds));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title font-bold text-cafe-text">{title}</h1>
        {onNew && (
          <Button onClick={onNew} size="default">
            <Plus className="h-4 w-4" /> {newLabel}
          </Button>
        )}
      </div>

      {/* Search + bulk actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cafe-text-muted" />
          <Input
            placeholder="Search…"
            className="pl-9"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-label text-cafe-text-muted font-semibold">
              {selectedIds.length} selected
            </span>
            {onBulkArchive && (
              <Button variant="outline" size="sm" onClick={() => onBulkArchive(selectedIds)}>
                <Archive className="h-4 w-4" /> Archive
              </Button>
            )}
            {onBulkDelete && (
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-cafe-surface border-neo border-cafe-text rounded-lg shadow-neo overflow-hidden">
        <div className="overflow-x-auto">
          <table className="neo-table">
            <thead>
              <tr>
                <th className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={col.numeric ? 'text-right' : ''}
                  >
                    {col.header}
                  </th>
                ))}
                {rowActions && <th className="w-24">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Skeleton loading rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-5" />
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-16" />
                      </td>
                    )}
                  </tr>
                ))
              ) : isError ? (
                // Error state
                <tr>
                  <td colSpan={columns.length + 1 + (rowActions ? 1 : 0)} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-cancelled-bg flex items-center justify-center border-neo border-cancelled">
                        <AlertCircle className="h-6 w-6 text-cancelled" />
                      </div>
                      <p className="text-sm font-semibold text-cafe-text">Something went wrong</p>
                      {onRetry && (
                        <Button variant="secondary" size="sm" onClick={onRetry}>
                          <RotateCcw className="h-4 w-4" /> Retry
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={columns.length + 1 + (rowActions ? 1 : 0)} className="px-4 py-16 text-center">
                    <p className="text-sm text-cafe-text-muted font-medium">{emptyMessage}</p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const id = getRowId(row);
                  return (
                    <tr
                      key={id}
                      className={onRowClick ? 'cursor-pointer' : ''}
                      onClick={() => onRowClick?.(row)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(id)}
                          onCheckedChange={() => toggleOne(id)}
                          aria-label={`Select ${id}`}
                        />
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 ${col.numeric ? 'text-right tabular-nums' : ''} ${col.className ?? ''}`}
                        >
                          {col.render
                            ? col.render(row)
                            : String((row as Record<string, unknown>)[col.key] ?? '')}
                        </td>
                      ))}
                      {rowActions && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {rowActions(row)}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm delete dialog */}
      {onBulkDelete && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete selected records"
          description={`This will permanently delete ${selectedIds.length} record${selectedIds.length > 1 ? 's' : ''}. This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            onBulkDelete(selectedIds);
            setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}
