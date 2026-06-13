import { LogOut } from 'lucide-react';
import { Placeholder } from '@/routes/Placeholder';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/AuthContext';

/**
 * Kitchen Display System (PRD §10 / §13.13). Standalone surface (no POS top bar)
 * — tickets, stages (To Cook → Preparing → Completed), filters, live updates.
 */
export function Kds() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-muted/20">
      <header className="flex h-16 items-center justify-between border-b bg-background px-4">
        <span className="text-lg font-bold tracking-tight text-primary">Cafe POS — Kitchen Display</span>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{user?.name}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <Placeholder title="Kitchen Display" prd="§10">
          <p>Real-time tickets on Send to Kitchen · click card to advance stage · click item to strike it · tabs All/To Cook/Preparing/Completed with live counts, search and filters.</p>
        </Placeholder>
      </main>
    </div>
  );
}
