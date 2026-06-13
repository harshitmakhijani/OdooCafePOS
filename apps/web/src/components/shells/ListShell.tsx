import { useMemo, useState, type ReactNode } from 'react';
import { Plus, Search, Trash2, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';

export interface ListColumn<T> {
  key: string;
  header: string;
  /** Custom cell renderer; defaults to `String(row[key])`. */
  render?: (row: T) => ReactNode;
  className?: string;
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
  emptyMessage?: string;
}

/**
 * Reusable admin list view (base prompt §6): New button, search, multi-select
 * checkboxes, and bulk Delete / Archive. Pure presentation — all data behavior
 * is delegated to callbacks. Selection is the only internal state.
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
  emptyMessage = 'No records yet.',
}: ListShellProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {onNew && (
          <Button onClick={onNew}>
            <Plus className="h-4 w-4" /> {newLabel}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search…"
            className="pl-9"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
            {onBulkArchive && (
              <Button variant="outline" size="sm" onClick={() => onBulkArchive(selectedIds)}>
                <Archive className="h-4 w-4" /> Archive
              </Button>
            )}
            {onBulkDelete && (
              <Button variant="destructive" size="sm" onClick={() => onBulkDelete(selectedIds)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr className="text-left">
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 font-medium ${col.className ?? ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = getRowId(row);
                return (
                  <tr
                    key={id}
                    className="border-b last:border-0 hover:bg-muted/30"
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
                      <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
