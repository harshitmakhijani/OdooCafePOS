import { Placeholder } from '@/routes/Placeholder';

/** Admin Coupons & Promotions (PRD §8.5 / §13.6). */
export function Promotions() {
  return (
    <Placeholder title="Coupons & Promotions" prd="§8.5">
      <p>One module, two types: coupons (code-redeemed) and automated promotions (condition-fired). One discount per order (PRD §7.1).</p>
    </Placeholder>
  );
}
