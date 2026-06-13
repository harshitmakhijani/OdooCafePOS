import { Placeholder } from '@/routes/Placeholder';

/** Admin Payment Methods (PRD §8.4 / §13.5). */
export function PaymentMethods() {
  return (
    <Placeholder title="Payment Methods" prd="§8.4">
      <p>Enable/disable + create/edit Cash / Card / UPI methods (UPI requires a saved UPI ID).</p>
    </Placeholder>
  );
}
