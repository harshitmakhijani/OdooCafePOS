import { Placeholder } from '@/routes/Placeholder';

/** POS Table View — all tables across floors, live status (PRD §9.8). */
export function TableView() {
  return (
    <Placeholder title="POS — Table View" prd="§9.8">
      <p>All tables across floors; occupied/reserved distinct from available (live). Selecting a table opens its order.</p>
    </Placeholder>
  );
}
