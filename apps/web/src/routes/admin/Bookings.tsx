import { Placeholder } from '@/routes/Placeholder';

/** Admin Bookings / table reservations (PRD §8.8 / §13.14). */
export function Bookings() {
  return (
    <Placeholder title="Bookings" prd="§8.8">
      <p>Create/list/edit/cancel reservations (customer or guest, floor+table, date/time, party size, status). Reserved tables flag on the floor.</p>
    </Placeholder>
  );
}
