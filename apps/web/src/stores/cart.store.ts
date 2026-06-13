import { create } from 'zustand';

/**
 * POS cart / current-draft-order local state (shape only — base prompt §6).
 * The SERVER is authoritative for all pricing (PRD §5/§7.1); this store only
 * tracks the in-progress UI selection. Totals shown to the user come from the
 * server on every order save.
 */
export interface CartLine {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

interface CartState {
  orderId: string | null;
  tableId: string | null;
  customerId: string | null;
  lines: CartLine[];
  selectedLineId: string | null;
  setActiveOrder: (payload: { orderId: string; tableId: string | null }) => void;
  setCustomer: (customerId: string | null) => void;
  setLines: (lines: CartLine[]) => void;
  selectLine: (productId: string | null) => void;
  reset: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  orderId: null,
  tableId: null,
  customerId: null,
  lines: [],
  selectedLineId: null,
  setActiveOrder: ({ orderId, tableId }) => set({ orderId, tableId }),
  setCustomer: (customerId) => set({ customerId }),
  setLines: (lines) => set({ lines }),
  selectLine: (productId) => set({ selectedLineId: productId }),
  reset: () =>
    set({ orderId: null, tableId: null, customerId: null, lines: [], selectedLineId: null }),
}));
