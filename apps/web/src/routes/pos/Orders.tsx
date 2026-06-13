import { Placeholder } from '@/routes/Placeholder';

/** POS Orders list for the current session (PRD §9.7). */
export function Orders() {
  return (
    <Placeholder title="POS — Orders" prd="§9.7">
      <p>Lists current session orders (number, date, customer, amount, status). Search by customer/number/date.</p>
    </Placeholder>
  );
}
