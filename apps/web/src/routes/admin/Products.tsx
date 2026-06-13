import { Placeholder } from '@/routes/Placeholder';

/** Admin Products (PRD §8.2 / §13.4). */
export function Products() {
  return (
    <Placeholder title="Products" prd="§8.2">
      <p>List/create/edit products (Name, Category, Price, UoM, Tax, Description, Show on KDS). Inline-create category from the product form.</p>
    </Placeholder>
  );
}
