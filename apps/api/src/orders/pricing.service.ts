import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * A cart line for pricing calculation.
 * All monetary values are Decimal (never float).
 */
export interface PricingCartLine {
  productId: string;
  unitPrice: Prisma.Decimal;
  quantity: Prisma.Decimal;
  taxPercent: Prisma.Decimal;
}

/**
 * A promotion for pricing evaluation.
 */
export interface PricingPromotion {
  id: string;
  type: 'COUPON' | 'AUTOMATED';
  scope: 'ORDER' | 'PRODUCT';
  code?: string | null;
  productId?: string | null;
  minQuantity?: number | null;
  minOrderAmount?: Prisma.Decimal | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: Prisma.Decimal;
  active: boolean;
}

/**
 * Result of pricing calculation.
 */
export interface PricingResult {
  subtotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  total: Prisma.Decimal;
  appliedPromotionId: string | null;
}

const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);

/**
 * Round Decimal to 2 decimal places, half-up.
 * Prisma Decimal uses decimal.js which supports toDecimalPlaces with rounding mode.
 */
function roundHalfUp(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/**
 * Pure pricing engine — no DB access.
 * Input: cart lines + optional applied coupon code + all active promotions.
 * Output: subtotal, discountTotal, taxTotal, total, appliedPromotionId.
 *
 * Algorithm per PRD §7.1:
 * 1. lineTotal[i] = round(unitPrice[i] * quantity[i], 2)
 * 2. subtotal = Σ lineTotal[i]
 * 3. Determine the single discount (no stacking):
 *    - If a valid coupon code is applied → that coupon is the discount.
 *    - Else, among active automated promotions whose trigger is met → largest discount wins.
 *    - Precedence: manual coupon always beats automated promos.
 * 4. discountAmount = PERCENTAGE ? round(subtotal * value/100) : min(value, subtotal)
 * 5. factor = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 0
 *    lineTax[i] = round(lineTotal[i] * factor * taxPercent[i] / 100, 2)
 *    taxTotal = Σ lineTax[i]
 * 6. total = (subtotal - discountAmount) + taxTotal
 */
@Injectable()
export class PricingService {
  calculate(
    lines: PricingCartLine[],
    appliedCouponCode: string | null,
    promotions: PricingPromotion[],
  ): PricingResult {
    // Empty cart → all zeros
    if (lines.length === 0) {
      return {
        subtotal: ZERO,
        discountTotal: ZERO,
        taxTotal: ZERO,
        total: ZERO,
        appliedPromotionId: null,
      };
    }

    // Step 1 + 2: line totals and subtotal
    const lineTotals = lines.map((line) =>
      roundHalfUp(line.unitPrice.mul(line.quantity)),
    );
    const subtotal = lineTotals.reduce((sum, lt) => sum.add(lt), ZERO);

    // Step 3: determine the single discount
    const { promotion: selectedPromo, discountAmount } = this.selectDiscount(
      lines,
      lineTotals,
      subtotal,
      appliedCouponCode,
      promotions,
    );

    // Step 4-5: proportional tax distribution
    const factor = subtotal.gt(ZERO)
      ? subtotal.sub(discountAmount).div(subtotal)
      : ZERO;

    const lineTaxes = lines.map((line, i) =>
      roundHalfUp(lineTotals[i].mul(factor).mul(line.taxPercent).div(HUNDRED)),
    );
    const taxTotal = lineTaxes.reduce((sum, lt) => sum.add(lt), ZERO);

    // Step 6: total
    const total = subtotal.sub(discountAmount).add(taxTotal);

    return {
      subtotal,
      discountTotal: discountAmount,
      taxTotal,
      total,
      appliedPromotionId: selectedPromo?.id ?? null,
    };
  }

  private selectDiscount(
    lines: PricingCartLine[],
    lineTotals: Prisma.Decimal[],
    subtotal: Prisma.Decimal,
    appliedCouponCode: string | null,
    promotions: PricingPromotion[],
  ): { promotion: PricingPromotion | null; discountAmount: Prisma.Decimal } {
    // 1. If a coupon code is applied, find that coupon
    if (appliedCouponCode) {
      const coupon = promotions.find(
        (p) =>
          p.type === 'COUPON' &&
          p.active &&
          p.code?.toLowerCase() === appliedCouponCode.toLowerCase(),
      );
      if (coupon) {
        const discountAmount = this.computeDiscountAmount(
          coupon,
          subtotal,
        );
        return { promotion: coupon, discountAmount };
      }
    }

    // 2. Among active automated promotions whose trigger condition is met,
    //    pick the one yielding the largest discount amount
    const qualifying = promotions
      .filter((p) => p.type === 'AUTOMATED' && p.active)
      .filter((p) => this.isPromotionTriggered(p, lines, subtotal))
      .map((p) => ({
        promotion: p,
        discountAmount: this.computeDiscountAmount(p, subtotal),
      }))
      .filter((x) => x.discountAmount.gt(ZERO));

    if (qualifying.length === 0) {
      return { promotion: null, discountAmount: ZERO };
    }

    // Pick the largest
    qualifying.sort((a, b) =>
      b.discountAmount.cmp(a.discountAmount),
    );
    return qualifying[0];
  }

  private isPromotionTriggered(
    promo: PricingPromotion,
    lines: PricingCartLine[],
    subtotal: Prisma.Decimal,
  ): boolean {
    if (promo.scope === 'PRODUCT') {
      if (!promo.productId || promo.minQuantity == null) return false;
      // Sum quantity for the matching product
      const totalQty = lines
        .filter((l) => l.productId === promo.productId)
        .reduce((sum, l) => sum.add(l.quantity), ZERO);
      return totalQty.gte(new Prisma.Decimal(promo.minQuantity));
    }

    if (promo.scope === 'ORDER') {
      if (promo.minOrderAmount == null) return false;
      return subtotal.gte(promo.minOrderAmount);
    }

    return false;
  }

  private computeDiscountAmount(
    promo: PricingPromotion,
    subtotal: Prisma.Decimal,
  ): Prisma.Decimal {
    if (promo.discountType === 'PERCENTAGE') {
      return roundHalfUp(subtotal.mul(promo.discountValue).div(HUNDRED));
    }
    // FIXED: capped at subtotal
    return Prisma.Decimal.min(promo.discountValue, subtotal);
  }
}
