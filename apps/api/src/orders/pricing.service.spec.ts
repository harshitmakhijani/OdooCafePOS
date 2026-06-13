import { Prisma } from '@prisma/client';
import { PricingService, PricingCartLine, PricingPromotion } from './pricing.service';

const D = (n: number | string) => new Prisma.Decimal(n);

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService();
  });

  /* ─────────── Helper ─────────── */
  function line(
    productId: string,
    unitPrice: number,
    quantity: number,
    taxPercent: number,
  ): PricingCartLine {
    return {
      productId,
      unitPrice: D(unitPrice),
      quantity: D(quantity),
      taxPercent: D(taxPercent),
    };
  }

  function promo(overrides: Partial<PricingPromotion> & { id: string }): PricingPromotion {
    return {
      type: 'AUTOMATED',
      scope: 'ORDER',
      code: null,
      productId: null,
      minQuantity: null,
      minOrderAmount: null,
      discountType: 'PERCENTAGE',
      discountValue: D(0),
      active: true,
      ...overrides,
    };
  }

  /* ─────────── 1. Empty cart ─────────── */
  it('returns all zeros for an empty cart', () => {
    const result = service.calculate([], null, []);
    expect(result.subtotal.equals(D(0))).toBe(true);
    expect(result.discountTotal.equals(D(0))).toBe(true);
    expect(result.taxTotal.equals(D(0))).toBe(true);
    expect(result.total.equals(D(0))).toBe(true);
    expect(result.appliedPromotionId).toBeNull();
  });

  /* ─────────── 2. Single-rate cart, no discount ─────────── */
  it('computes correct totals for a single-rate cart without discount', () => {
    const lines = [line('tea', 40, 2, 5)];
    const result = service.calculate(lines, null, []);

    expect(result.subtotal.equals(D(80))).toBe(true);
    expect(result.discountTotal.equals(D(0))).toBe(true);
    // tax = round(80 * 1 * 5/100) = 4.00
    expect(result.taxTotal.equals(D(4))).toBe(true);
    expect(result.total.equals(D(84))).toBe(true);
  });

  /* ─────────── 3. WORKED EXAMPLE — must match to the rupee ─────────── */
  it('matches the PRD worked example: Tea ₹40×2 @5%, Burger ₹250×1 @18%, 20% coupon → total ₹303.20', () => {
    const lines = [
      line('tea', 40, 2, 5),
      line('burger', 250, 1, 18),
    ];
    const coupon = promo({
      id: 'coupon-20',
      type: 'COUPON',
      code: 'SAVE20',
      discountType: 'PERCENTAGE',
      discountValue: D(20),
    });

    const result = service.calculate(lines, 'SAVE20', [coupon]);

    // lineTotals: 80.00, 250.00 → subtotal: 330.00
    expect(result.subtotal.equals(D('330.00'))).toBe(true);

    // discountAmount = round(330 × 0.20) = 66.00
    expect(result.discountTotal.equals(D('66.00'))).toBe(true);

    // factor = 264/330 = 0.8
    // tea tax = round(80 × 0.8 × 0.05) = round(3.20) = 3.20
    // burger tax = round(250 × 0.8 × 0.18) = round(36.00) = 36.00
    // taxTotal = 39.20
    expect(result.taxTotal.equals(D('39.20'))).toBe(true);

    // total = 264.00 + 39.20 = 303.20
    expect(result.total.equals(D('303.20'))).toBe(true);
    expect(result.appliedPromotionId).toBe('coupon-20');
  });

  /* ─────────── 4. Percentage discount ─────────── */
  it('applies a percentage discount correctly', () => {
    const lines = [line('item', 100, 1, 10)];
    const p = promo({
      id: 'p1',
      type: 'COUPON',
      code: 'TEN',
      discountType: 'PERCENTAGE',
      discountValue: D(10),
    });

    const result = service.calculate(lines, 'TEN', [p]);

    // subtotal=100, discount=10, factor=0.9, tax=round(100*0.9*0.10)=9
    expect(result.subtotal.equals(D(100))).toBe(true);
    expect(result.discountTotal.equals(D(10))).toBe(true);
    expect(result.taxTotal.equals(D(9))).toBe(true);
    expect(result.total.equals(D(99))).toBe(true);
  });

  /* ─────────── 5. Fixed discount ─────────── */
  it('applies a fixed discount correctly', () => {
    const lines = [line('item', 200, 1, 18)];
    const p = promo({
      id: 'f1',
      type: 'COUPON',
      code: 'FLAT50',
      discountType: 'FIXED',
      discountValue: D(50),
    });

    const result = service.calculate(lines, 'FLAT50', [p]);

    // subtotal=200, discount=50, factor=150/200=0.75
    // tax = round(200 * 0.75 * 0.18) = round(27) = 27
    expect(result.subtotal.equals(D(200))).toBe(true);
    expect(result.discountTotal.equals(D(50))).toBe(true);
    expect(result.taxTotal.equals(D(27))).toBe(true);
    expect(result.total.equals(D(177))).toBe(true);
  });

  /* ─────────── 6. Fixed discount CAPPED at subtotal ─────────── */
  it('caps a fixed discount at the subtotal (subtotal=330, fixed=400 → discount=330, total=0)', () => {
    const lines = [
      line('tea', 40, 2, 5),
      line('burger', 250, 1, 18),
    ];
    const p = promo({
      id: 'big',
      type: 'COUPON',
      code: 'BIGDEAL',
      discountType: 'FIXED',
      discountValue: D(400),
    });

    const result = service.calculate(lines, 'BIGDEAL', [p]);

    expect(result.subtotal.equals(D(330))).toBe(true);
    expect(result.discountTotal.equals(D(330))).toBe(true);
    expect(result.taxTotal.equals(D(0))).toBe(true);
    expect(result.total.equals(D(0))).toBe(true);
  });

  /* ─────────── 7. Manual coupon beats qualifying auto promo ─────────── */
  it('selects manual coupon over a qualifying automated promo (no stacking)', () => {
    const lines = [line('item', 500, 1, 18)];
    const coupon = promo({
      id: 'manual-c',
      type: 'COUPON',
      code: 'MANUAL10',
      discountType: 'PERCENTAGE',
      discountValue: D(10), // 50 discount
    });
    const auto = promo({
      id: 'auto-big',
      type: 'AUTOMATED',
      scope: 'ORDER',
      minOrderAmount: D(100),
      discountType: 'PERCENTAGE',
      discountValue: D(30), // 150 discount — larger, but manual wins
    });

    const result = service.calculate(lines, 'MANUAL10', [coupon, auto]);

    expect(result.discountTotal.equals(D(50))).toBe(true);
    expect(result.appliedPromotionId).toBe('manual-c');
  });

  /* ─────────── 8. Among two qualifying autos, largest wins ─────────── */
  it('selects the automated promo yielding the largest discount', () => {
    const lines = [line('item', 300, 1, 5)];
    const small = promo({
      id: 'auto-small',
      type: 'AUTOMATED',
      scope: 'ORDER',
      minOrderAmount: D(100),
      discountType: 'FIXED',
      discountValue: D(20),
    });
    const big = promo({
      id: 'auto-big',
      type: 'AUTOMATED',
      scope: 'ORDER',
      minOrderAmount: D(200),
      discountType: 'FIXED',
      discountValue: D(60),
    });

    const result = service.calculate(lines, null, [small, big]);

    expect(result.discountTotal.equals(D(60))).toBe(true);
    expect(result.appliedPromotionId).toBe('auto-big');
  });

  /* ─────────── 9. PRODUCT promo meets minQuantity ─────────── */
  it('applies a PRODUCT promo when minQuantity is met', () => {
    const lines = [line('coffee', 100, 3, 5)];
    const p = promo({
      id: 'prod-p',
      type: 'AUTOMATED',
      scope: 'PRODUCT',
      productId: 'coffee',
      minQuantity: 2,
      discountType: 'PERCENTAGE',
      discountValue: D(15),
    });

    const result = service.calculate(lines, null, [p]);

    // subtotal=300, discount=round(300*0.15)=45
    expect(result.discountTotal.equals(D(45))).toBe(true);
    expect(result.appliedPromotionId).toBe('prod-p');
  });

  /* ─────────── 10. PRODUCT promo doesn't meet minQuantity ─────────── */
  it('does NOT apply a PRODUCT promo when minQuantity is not met', () => {
    const lines = [line('coffee', 100, 1, 5)];
    const p = promo({
      id: 'prod-no',
      type: 'AUTOMATED',
      scope: 'PRODUCT',
      productId: 'coffee',
      minQuantity: 3,
      discountType: 'PERCENTAGE',
      discountValue: D(15),
    });

    const result = service.calculate(lines, null, [p]);

    expect(result.discountTotal.equals(D(0))).toBe(true);
    expect(result.appliedPromotionId).toBeNull();
  });

  /* ─────────── 11. ORDER promo meets minOrderAmount ─────────── */
  it('applies an ORDER promo when minOrderAmount is met', () => {
    const lines = [line('item', 200, 2, 10)];
    const p = promo({
      id: 'order-ok',
      type: 'AUTOMATED',
      scope: 'ORDER',
      minOrderAmount: D(300),
      discountType: 'FIXED',
      discountValue: D(30),
    });

    const result = service.calculate(lines, null, [p]);

    expect(result.discountTotal.equals(D(30))).toBe(true);
    expect(result.appliedPromotionId).toBe('order-ok');
  });

  /* ─────────── 12. ORDER promo doesn't meet minOrderAmount ─────────── */
  it('does NOT apply an ORDER promo when minOrderAmount is not met', () => {
    const lines = [line('item', 100, 1, 10)];
    const p = promo({
      id: 'order-no',
      type: 'AUTOMATED',
      scope: 'ORDER',
      minOrderAmount: D(500),
      discountType: 'FIXED',
      discountValue: D(30),
    });

    const result = service.calculate(lines, null, [p]);

    expect(result.discountTotal.equals(D(0))).toBe(true);
    expect(result.appliedPromotionId).toBeNull();
  });

  /* ─────────── 13. Rounding boundaries ─────────── */
  it('rounds half-up to 2 decimal places at each step', () => {
    // 33.33 × 3 = 99.99 (not 100)
    const lines = [line('item', 33.33, 3, 18)];
    const result = service.calculate(lines, null, []);

    expect(result.subtotal.equals(D('99.99'))).toBe(true);
    // tax = round(99.99 * 1 * 18/100) = round(17.9982) = 18.00
    expect(result.taxTotal.equals(D('18.00'))).toBe(true);
    expect(result.total.equals(D('117.99'))).toBe(true);
  });

  /* ─────────── 14. Mixed-rate cart no discount ─────────── */
  it('computes correct mixed-rate cart without discount', () => {
    const lines = [
      line('tea', 40, 2, 5),
      line('burger', 250, 1, 18),
    ];
    const result = service.calculate(lines, null, []);

    // subtotal: 80+250=330, factor=1
    // tea tax: round(80*1*0.05)=4, burger tax: round(250*1*0.18)=45
    // taxTotal=49, total=330+49=379
    expect(result.subtotal.equals(D(330))).toBe(true);
    expect(result.taxTotal.equals(D(49))).toBe(true);
    expect(result.total.equals(D(379))).toBe(true);
  });

  /* ─────────── 15. Inactive promo is ignored ─────────── */
  it('ignores inactive promotions', () => {
    const lines = [line('item', 100, 1, 5)];
    const p = promo({
      id: 'inactive',
      type: 'AUTOMATED',
      scope: 'ORDER',
      minOrderAmount: D(50),
      discountType: 'FIXED',
      discountValue: D(20),
      active: false,
    });

    const result = service.calculate(lines, null, [p]);
    expect(result.discountTotal.equals(D(0))).toBe(true);
  });
});
