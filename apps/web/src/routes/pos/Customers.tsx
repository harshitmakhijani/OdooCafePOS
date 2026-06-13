import { Placeholder } from '@/routes/Placeholder';

/** POS Customer management (PRD §9.9). */
export function Customers() {
  return (
    <Placeholder title="POS — Customers" prd="§9.9">
      <p>Search/create customers (Name, Email, Phone). Selecting one links them to the current order for receipt delivery.</p>
    </Placeholder>
  );
}
