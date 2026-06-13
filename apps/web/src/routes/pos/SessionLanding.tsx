import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, DollarSign, Coffee } from 'lucide-react';

/** POS Session Landing — open a session to start taking orders (PRD §9.2). */
export function SessionLanding() {
  const navigate = useNavigate();
  const [register, setRegister] = useState('');

  // Mock data — will be replaced with API call
  const lastSession = { date: 'Jun 12, 2026 · 8:45 PM', closingSale: '₹12,450' };
  const registers = [
    { value: 'reg-1', label: 'Counter 1' },
    { value: 'reg-2', label: 'Counter 2' },
    { value: 'reg-3', label: 'Counter 3' },
  ];

  const handleOpen = () => {
    if (!register) return;
    // TODO: POST /sessions/open → then navigate to floor popup
    navigate('/pos/order');
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-6">
          {/* Logo header */}
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-coral border-[3px] border-cafe-text shadow-neo-sm flex items-center justify-center">
              <Coffee className="h-7 w-7 text-coral-foreground" />
            </div>
            <h1 className="text-title font-bold text-cafe-text">Open a session</h1>
            <p className="text-sm text-cafe-text-muted text-center">
              Select a register and open a new session to start taking orders.
            </p>
          </div>

          {/* Last session info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border-neo border-cafe-text bg-cafe-surface-2 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cafe-text-muted uppercase tracking-wide">
                <Calendar className="h-3.5 w-3.5" /> Last session
              </div>
              <p className="text-sm font-bold text-cafe-text">{lastSession.date}</p>
            </div>
            <div className="rounded-lg border-neo border-cafe-text bg-cafe-surface-2 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cafe-text-muted uppercase tracking-wide">
                <DollarSign className="h-3.5 w-3.5" /> Closing sale
              </div>
              <p className="text-sm font-bold text-cafe-text">{lastSession.closingSale}</p>
            </div>
          </div>

          {/* Register select */}
          <div className="space-y-2">
            <label className="text-label font-semibold text-cafe-text">Register</label>
            <Select
              options={registers}
              placeholder="Select a register…"
              value={register}
              onChange={(e) => setRegister(e.target.value)}
            />
          </div>

          {/* Open session button */}
          <Button
            onClick={handleOpen}
            size="xl"
            className="w-full"
            disabled={!register}
          >
            Open session
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
