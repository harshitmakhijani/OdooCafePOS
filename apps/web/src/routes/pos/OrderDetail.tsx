import { useParams } from 'react-router-dom';
import { Placeholder } from '@/routes/Placeholder';

/** POS Order Detail (PRD §9.7) — Draft: Delete/Edit · Paid: view-only. */
export function OrderDetail() {
  const { orderId } = useParams();
  return (
    <Placeholder title="POS — Order Detail" prd="§9.7">
      <p>Order {orderId ?? '—'}: number, date, customer, amount, status, products. Draft → Delete/Edit; Paid → view-only.</p>
    </Placeholder>
  );
}
