/**
 * Minimal typings for the Razorpay Checkout SDK loaded at runtime from
 * https://checkout.razorpay.com/v1/checkout.js (PRD §15.1). Only the surface the
 * POS uses is modelled. Augments the global `window.Razorpay` constructor so call
 * sites don't need `(window as any)`.
 */
export interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailureResponse {
  error: { description: string };
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayHandlerResponse) => void;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
}

export interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', cb: (resp: RazorpayFailureResponse) => void) => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
