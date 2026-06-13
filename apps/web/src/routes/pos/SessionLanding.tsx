import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { SuccessEnvelope } from '@cafe-pos/types';

interface Session {
  id: string;
  employeeId: string;
  registerId: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  closingAmount: string | null;
  register?: { id: string; name: string };
  employee?: { id: string; name: string };
}

interface CurrentSessionResponse {
  currentSession: Session | null;
  lastSessionDate: string | null;
  lastClosingSale: string | null;
}

interface Register {
  id: string;
  name: string;
  active: boolean;
}

export function SessionLanding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [lastSessionDate, setLastSessionDate] = useState<string | null>(null);
  const [lastClosingSale, setLastClosingSale] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Closing summary state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState<{ orderCount: number; totalSales: string } | null>(null);

  const fetchSessionStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<CurrentSessionResponse>('/sessions/current');
      const data = res.data;
      setCurrentSession(data.currentSession);
      setLastSessionDate(data.lastSessionDate);
      setLastClosingSale(data.lastClosingSale);

      if (!data.currentSession) {
        // Fetch registers if no active session
        const regRes = await api.get<SuccessEnvelope<Register[]>>('/registers');
        // Handle pagination data format
        const regList = (regRes.data?.data ?? regRes.data) as Register[];
        setRegisters(regList);
        if (regList.length > 0) {
          setSelectedRegisterId(regList[0].id);
        }
      }
    } catch (err) {
      setError('Failed to fetch session status. Check server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionStatus();
  }, []);

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegisterId) return;
    setError(null);
    setActionLoading(true);
    try {
      await api.post('/sessions/open', { registerId: selectedRegisterId });
      navigate('/pos/tables');
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Failed to open session.';
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseSession = async () => {
    if (!currentSession) return;
    if (!window.confirm('Are you sure you want to close this register session? This will lock all sales calculations.')) return;
    
    setError(null);
    setActionLoading(true);
    try {
      const res = await api.post(`/sessions/${currentSession.id}/close`);
      const { summary } = res.data;
      setSummaryData({
        orderCount: summary.orderCount,
        totalSales: summary.totalSales.toString(),
      });
      setShowSummaryModal(true);
      setCurrentSession(null);
      fetchSessionStatus();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Failed to close session.';
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-black border-t-neubrutal-coral"></div>
        <p className="font-bold text-black uppercase tracking-wider text-sm">Loading session status...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-8">
      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 border-2 border-black bg-red-100 rounded-lg font-bold text-red-700 shadow-neubrutal-sm">
          ⚠️ {error}
        </div>
      )}

      {currentSession ? (
        /* Active Session Panel */
        <div className="nb-card p-6 bg-white space-y-6">
          <div className="border-b-2 border-black pb-4 flex justify-between items-start">
            <div>
              <span className="nb-badge bg-neubrutal-lime text-black uppercase text-xs tracking-wider mb-2">
                SESSION ACTIVE
              </span>
              <h2 className="text-2xl font-extrabold text-black">Active Register Session</h2>
            </div>
            <span className="text-xs font-mono font-bold bg-neutral-100 border-2 border-black px-2 py-1">
              ID: {currentSession.id.slice(0, 8)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm font-bold">
            <div className="p-3 border-2 border-black rounded-lg bg-neubrutal-cream/30">
              <div className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Register</div>
              <div className="text-black font-extrabold text-lg">{currentSession.register?.name ?? 'Unknown'}</div>
            </div>
            <div className="p-3 border-2 border-black rounded-lg bg-neubrutal-cream/30">
              <div className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Opened At</div>
              <div className="text-black font-extrabold text-lg">
                {new Date(currentSession.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              onClick={() => navigate('/pos/tables')}
              className="flex-1 nb-button-primary py-3 text-sm uppercase font-black tracking-wider"
              disabled={actionLoading}
            >
              Enter POS Terminal ➔
            </button>
            <button
              onClick={handleCloseSession}
              className="nb-button-destructive py-3 px-6 text-sm uppercase font-black tracking-wider"
              disabled={actionLoading}
            >
              Close Session
            </button>
          </div>
        </div>
      ) : (
        /* Open New Session Panel */
        <div className="nb-card p-6 bg-white space-y-6">
          <div className="border-b-2 border-black pb-4">
            <span className="nb-badge bg-neubrutal-lavender text-black uppercase text-xs tracking-wider mb-2">
              SESSION CLOSED
            </span>
            <h2 className="text-2xl font-extrabold text-black">Open Register Session</h2>
            <p className="text-xs text-neutral-600 font-bold mt-1">Select a register counter to begin transactions.</p>
          </div>

          {/* Last Session Info Banner */}
          {(lastSessionDate || lastClosingSale) && (
            <div className="p-4 border-2 border-black bg-neubrutal-coral/10 rounded-lg text-xs font-bold space-y-1">
              <div className="text-neutral-600 uppercase tracking-widest text-[10px]">Previous Session Information</div>
              <div className="flex justify-between">
                <span>Closed At: {lastSessionDate ? new Date(lastSessionDate).toLocaleString() : 'N/A'}</span>
                <span className="text-neubrutal-coral font-black">Sales: ₹{lastClosingSale ? parseFloat(lastClosingSale).toFixed(2) : '0.00'}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleOpenSession} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="register" className="text-xs font-bold uppercase tracking-wider text-black block">
                Choose Register / Counter
              </label>
              <select
                id="register"
                value={selectedRegisterId}
                onChange={(e) => setSelectedRegisterId(e.target.value)}
                required
                className="w-full nb-input font-bold appearance-none cursor-pointer"
              >
                {registers.length === 0 ? (
                  <option value="">No counters available</option>
                ) : (
                  registers.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              type="submit"
              className="w-full nb-button-primary py-3 text-sm font-black uppercase tracking-wider"
              disabled={actionLoading || registers.length === 0}
            >
              {actionLoading ? 'Opening Session...' : 'Open Session ➔'}
            </button>
          </form>
        </div>
      )}

      {/* Closing Summary Modal */}
      {showSummaryModal && summaryData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm nb-card bg-white p-6 space-y-6">
            <div className="text-center">
              <div className="inline-block nb-badge bg-neubrutal-lime text-black mb-2 px-3 py-1 text-xs tracking-wider uppercase rotate-2">
                SESSION CLOSED SUMMARY
              </div>
              <h3 className="text-2xl font-extrabold text-black mt-2">Closed Successfully</h3>
              <p className="text-xs text-neutral-500 font-bold mt-1">Here is your shift session breakdown.</p>
            </div>

            <div className="border-2 border-black rounded-lg overflow-hidden font-bold">
              <div className="grid grid-cols-2 border-b-2 border-black">
                <div className="p-3 bg-neubrutal-cream/20 border-r-2 border-black text-center">
                  <div className="text-neutral-500 text-[10px] uppercase tracking-wider">Orders Count</div>
                  <div className="text-black font-black text-2xl mt-1">{summaryData.orderCount}</div>
                </div>
                <div className="p-3 bg-neubrutal-cream/20 text-center">
                  <div className="text-neutral-500 text-[10px] uppercase tracking-wider">Total Sales</div>
                  <div className="text-neubrutal-coral font-black text-2xl mt-1">₹{parseFloat(summaryData.totalSales).toFixed(2)}</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSummaryModal(false)}
              className="w-full nb-button-secondary py-3 text-sm font-black uppercase tracking-wider"
            >
              Acknowledge & Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
