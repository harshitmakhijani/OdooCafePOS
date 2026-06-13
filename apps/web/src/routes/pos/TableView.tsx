import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { TableStatus } from '@cafe-pos/types';
import { Armchair, Coffee } from 'lucide-react';

interface Table {
  id: string;
  floorId: string;
  tableNumber: number;
  seats: number;
  active: boolean;
  status: TableStatus;
  activeOrderId: string | null;
}

interface Floor {
  id: string;
  name: string;
  tables: Table[];
}

export function TableView() {
  const navigate = useNavigate();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingOrderId, setCreatingOrderId] = useState<string | null>(null);

  const fetchFloors = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ data: Floor[] }>('/floors');
      const data = res.data.data;
      setFloors(data);
      if (data.length > 0) {
        setActiveFloorId(data[0].id);
      }
    } catch (err) {
      setError('Failed to load floor layout. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloors();

    // Set up Socket.IO listener for real-time table status updates
    const socket = getSocket();
    
    socket.on('table:status', (payload) => {
      setFloors((prevFloors) =>
        prevFloors.map((floor) => ({
          ...floor,
          tables: floor.tables.map((table) => {
            if (table.id === payload.tableId) {
              return {
                ...table,
                status: payload.status,
                // If the table becomes available, clear activeOrderId
                activeOrderId: payload.status === TableStatus.AVAILABLE ? null : table.activeOrderId,
              };
            }
            return table;
          }),
        }))
      );
    });

    socket.on('order:updated', (payload) => {
      // If an order updates, sync its activeOrderId to the matching table
      setFloors((prevFloors) =>
        prevFloors.map((floor) => ({
          ...floor,
          tables: floor.tables.map((table) => {
            if (table.id === payload.tableId) {
              return {
                ...table,
                activeOrderId: payload.status === 'DRAFT' ? payload.orderId : null,
              };
            }
            return table;
          }),
        }))
      );
    });

    return () => {
      socket.off('table:status');
      socket.off('order:updated');
    };
  }, []);

  const handleTableClick = async (table: Table) => {
    if (creatingOrderId) return;

    if (table.activeOrderId) {
      // Load existing active order
      navigate(`/pos/order?orderId=${table.activeOrderId}&tableId=${table.id}&tableNumber=${table.tableNumber}`);
    } else {
      // Create new draft order
      setCreatingOrderId(table.id);
      try {
        const res = await api.post('/orders', { tableId: table.id });
        const newOrder = res.data?.data ?? res.data;
        navigate(`/pos/order?orderId=${newOrder.id}&tableId=${table.id}&tableNumber=${table.tableNumber}`);
      } catch (err) {
        setError('Failed to create new order for this table.');
      } finally {
        setCreatingOrderId(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-black border-t-neubrutal-coral"></div>
        <p className="font-bold text-black uppercase tracking-wider text-sm">Loading floor layout...</p>
      </div>
    );
  }

  const activeFloor = floors.find((f) => f.id === activeFloorId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b-2 border-black pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-black">Table Layout</h1>
          <p className="text-xs text-neutral-600 font-bold mt-1">Select a table to start taking orders.</p>
        </div>
        <div className="flex gap-2">
          <div className="nb-badge bg-white text-black text-xs uppercase py-1 px-3">
            🟢 Green = Available
          </div>
          <div className="nb-badge bg-neubrutal-coral/20 text-black text-xs uppercase py-1 px-3">
            🔴 Coral = Occupied
          </div>
          <div className="nb-badge bg-neubrutal-lavender/30 text-black text-xs uppercase py-1 px-3">
            🟣 Purple = Reserved
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 border-2 border-black bg-red-100 rounded-lg font-bold text-red-700 shadow-neubrutal-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Floor Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {floors.map((floor) => (
          <button
            key={floor.id}
            onClick={() => setActiveFloorId(floor.id)}
            className={`nb-button px-5 py-2.5 text-sm uppercase tracking-wider ${
              activeFloorId === floor.id
                ? 'bg-neubrutal-lavender text-black'
                : 'bg-white text-black'
            }`}
          >
            {floor.name}
          </button>
        ))}
      </div>

      {/* Seating Cards Grid */}
      {activeFloor && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {activeFloor.tables.map((table) => {
            const isOccupied = table.status === TableStatus.OCCUPIED;
            const isReserved = table.status === TableStatus.RESERVED;
            const isCreating = creatingOrderId === table.id;

            let cardStyle = 'bg-white hover:bg-neutral-50';
            let badgeStyle = 'bg-green-100 text-green-800';
            let statusText = 'Available';

            if (isOccupied) {
              cardStyle = 'bg-neubrutal-coral-soft hover:bg-red-50/80';
              badgeStyle = 'bg-neubrutal-coral text-white';
              statusText = 'Occupied';
            } else if (isReserved) {
              cardStyle = 'bg-neubrutal-lavender/20 hover:bg-purple-50/80';
              badgeStyle = 'bg-neubrutal-lavender text-black';
              statusText = 'Reserved';
            }

            return (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                disabled={isCreating || !table.active}
                className={`w-full nb-card nb-card-hover p-4 text-left flex flex-col justify-between min-h-[140px] select-none border-2 border-black ${cardStyle} ${
                  !table.active ? 'opacity-40 cursor-not-allowed shadow-none' : ''
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <div className="h-10 w-10 border-2 border-black rounded-lg bg-white flex items-center justify-center shadow-neubrutal-sm">
                    <Coffee className="h-5 w-5 text-black" />
                  </div>
                  <span className={`nb-badge text-[10px] px-2 py-0.5 uppercase tracking-wide ${badgeStyle}`}>
                    {isCreating ? 'Creating...' : statusText}
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="text-xl font-black text-black">Table {table.tableNumber}</h3>
                  <div className="flex items-center text-xs font-bold text-neutral-600 mt-1 gap-1">
                    <Armchair className="h-3 w-3" />
                    <span>{table.seats} Seats</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {floors.length === 0 && (
        <div className="p-8 border-2 border-black bg-white rounded-lg text-center font-bold text-neutral-500 shadow-neubrutal-sm">
          No floor layout configurations found. Please create floors and tables in the admin dashboard.
        </div>
      )}
    </div>
  );
}
