import { useMemo, useState, type ReactNode } from 'react';
import { Plus, Search, Trash2, Archive } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

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
 * Reusable admin list view styled in Neubrutalism:
 * Big bold headers, thick borders, solid drop shadows, sand inputs, and active depressions.
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
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-4 border-black pb-4">
        <h1 className="text-3xl font-black text-black tracking-tight uppercase">{title}</h1>
        {onNew && (
          <button onClick={onNew} className="nb-button-secondary py-2.5 px-5 text-sm uppercase tracking-wider font-extrabold">
            <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> {newLabel}
          </button>
        )}
      </div>

      {/* Search and Selection Bulk Panel */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-black stroke-[2.5px]" />
          <input
            type="text"
            placeholder="Search record..."
            className="nb-input w-full !pl-10 py-2.5 font-bold text-black border-2 border-black"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-neubrutal-lime border-2 border-black p-2.5 rounded-lg shadow-neubrutal-sm animate-in fade-in slide-in-from-top-1 duration-150">
            <span className="text-xs font-black text-black uppercase tracking-wider">
              {selectedIds.length} Selected
            </span>
            <div className="flex gap-2">
              {onBulkArchive && (
                <button
                  onClick={() => onBulkArchive(selectedIds)}
                  className="nb-button-white px-3 py-1.5 text-xs uppercase font-extrabold flex items-center gap-1 shadow-none hover:shadow-neubrutal-sm active:translate-x-[1px] active:translate-y-[1px]"
                >
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
              )}
              {onBulkDelete && (
                <button
                  onClick={() => onBulkDelete(selectedIds)}
                  className="nb-button-destructive px-3 py-1.5 text-xs uppercase font-extrabold flex items-center gap-1 shadow-none hover:shadow-neubrutal-sm active:translate-x-[1px] active:translate-y-[1px]"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="nb-card overflow-hidden p-0 border-2 border-black shadow-neubrutal-md bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm font-bold text-black">
            <thead>
              <tr className="border-b-2 border-black bg-neubrutal-lavender">
                <th className="w-12 px-4 py-3.5 border-r-2 border-black">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                    className="border-2 border-black data-[state=checked]:bg-black data-[state=checked]:text-white rounded-none"
                  />
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3.5 text-xs uppercase font-black tracking-wider text-black border-r-2 border-black last:border-r-0 ${
                      col.className ?? ''
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-neutral-500 font-bold uppercase tracking-wider">
                    <div className="flex justify-center items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-neubrutal-coral"></div>
                      <span>Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-neutral-500 font-bold uppercase tracking-wider">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const id = getRowId(row);
                  const isRowSelected = selected.has(id);
                  return (
                    <tr
                      key={id}
                      className={`border-b-2 border-black last:border-b-0 cursor-pointer transition-colors duration-100 ${
                        isRowSelected ? 'bg-neubrutal-coral-soft/50' : 'hover:bg-neutral-50'
                      }`}
                      onClick={() => onRowClick?.(row)}
                    >
                      <td className="px-4 py-4 border-r-2 border-black" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isRowSelected}
                          onCheckedChange={() => toggleOne(id)}
                          aria-label={`Select ${id}`}
                          className="border-2 border-black data-[state=checked]:bg-neubrutal-coral data-[state=checked]:text-white rounded-none"
                        />
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-4 border-r-2 border-black last:border-r-0 font-bold text-black ${
                            col.className ?? ''
                          }`}
                        >
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
        </div>
      </div>
    </div>
  );
}
