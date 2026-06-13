import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Armchair } from 'lucide-react';

type TableStatus = 'available' | 'occupied' | 'reserved';

interface TableCard {
  id: string;
  number: number;
  seats: number;
  status: TableStatus;
  floor: string;
}

const FLOORS = ['Ground Floor', '1st Floor', 'Terrace'];

const MOCK_TABLES: TableCard[] = [
  { id: 't1', number: 1, seats: 4, status: 'available', floor: 'Ground Floor' },
  { id: 't2', number: 2, seats: 2, status: 'occupied', floor: 'Ground Floor' },
  { id: 't3', number: 3, seats: 4, status: 'available', floor: 'Ground Floor' },
  { id: 't4', number: 4, seats: 6, status: 'reserved', floor: 'Ground Floor' },
  { id: 't5', number: 5, seats: 2, status: 'available', floor: 'Ground Floor' },
  { id: 't6', number: 6, seats: 4, status: 'occupied', floor: 'Ground Floor' },
  { id: 't7', number: 7, seats: 8, status: 'available', floor: '1st Floor' },
  { id: 't8', number: 8, seats: 4, status: 'available', floor: '1st Floor' },
  { id: 't9', number: 9, seats: 2, status: 'occupied', floor: '1st Floor' },
  { id: 't10', number: 10, seats: 6, status: 'available', floor: 'Terrace' },
  { id: 't11', number: 11, seats: 4, status: 'reserved', floor: 'Terrace' },
  { id: 't12', number: 12, seats: 2, status: 'available', floor: 'Terrace' },
];

const statusStyles: Record<TableStatus, { card: string; label: string; text: string }> = {
  available: {
    card: 'bg-cafe-surface hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-hover',
    label: '',
    text: 'Available',
  },
  occupied: {
    card: 'bg-coral-soft',
    label: 'neo-pill-draft',
    text: 'Occupied',
  },
  reserved: {
    card: 'bg-info-bg',
    label: 'neo-pill-info',
    text: 'Reserved',
  },
};

/** Full-screen table grid across all floors — live-updating (PRD §9.8). */
export function TableView() {
  const [activeFloor, setActiveFloor] = useState(FLOORS[0]);

  const tables = MOCK_TABLES.filter((t) => t.floor === activeFloor);

  return (
    <div className="space-y-4">
      <h1 className="text-title font-bold text-cafe-text">Table view</h1>

      {/* Floor tabs */}
      <div className="flex gap-2">
        {FLOORS.map((floor) => (
          <button
            key={floor}
            onClick={() => setActiveFloor(floor)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold border-neo border-cafe-text transition-all',
              activeFloor === floor
                ? 'bg-coral text-coral-foreground shadow-none translate-x-[1px] translate-y-[1px]'
                : 'bg-cafe-surface text-cafe-text shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none',
            )}
          >
            {floor}
          </button>
        ))}
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {tables.map((table) => {
          const styles = statusStyles[table.status];
          return (
            <button
              key={table.id}
              type="button"
              className={cn(
                'flex flex-col items-center justify-center gap-2 p-5 rounded-lg border-neo border-cafe-text shadow-neo transition-all min-h-[120px] touch-target',
                styles.card,
              )}
            >
              <span className="text-2xl font-extrabold text-cafe-text">{table.number}</span>
              <div className="flex items-center gap-1 text-xs text-cafe-text-muted font-semibold">
                <Armchair className="h-3.5 w-3.5" />
                {table.seats} seats
              </div>
              {table.status !== 'available' && (
                <span className={cn('neo-pill text-[10px]', styles.label)}>
                  {styles.text}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
