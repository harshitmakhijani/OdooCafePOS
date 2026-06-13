import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  PricingService,
  type PricingCartLine,
  type PricingPromotion,
  type PricingResult,
} from './pricing.service';
import { OrderQueryDto } from './dto/order-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { Paginated } from '../common/interceptors/response.interceptor';
import type { KdsTicket, OrderUpdatedEvent, TableStatusEvent } from '@cafe-pos/types';
import { KdsStage, TableStatus, BookingStatus } from '@cafe-pos/types';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /* ────────────── LIST / DETAIL ────────────── */

  async findAll(query: OrderQueryDto) {
    const { page, pageSize, search, sessionId } = query;

    const orConditions: Prisma.OrderWhereInput[] = [];
    if (search) {
      orConditions.push({
        customer: { is: { name: { contains: search, mode: 'insensitive' } } },
      });
      const parsed = Number(search);
      if (!isNaN(parsed) && search.trim() !== '') {
        orConditions.push({ orderNumber: parsed });
      }
      // Search by date (PRD §9.7) — a YYYY-MM-DD value matches that calendar day.
      if (/^\d{4}-\d{2}-\d{2}$/.test(search.trim())) {
        const dayStart = new Date(`${search.trim()}T00:00:00.000Z`);
        if (!isNaN(dayStart.getTime())) {
          const dayEnd = new Date(dayStart.getTime() + 86_400_000);
          orConditions.push({ createdAt: { gte: dayStart, lt: dayEnd } });
        }
      }
    }

    const where: Prisma.OrderWhereInput = {
      ...(sessionId ? { sessionId } : {}),
      ...(orConditions.length > 0 ? { OR: orConditions } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          lines: true,
          payment: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return new Paginated(items, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: { include: { product: { select: { id: true, name: true, categoryId: true } } } },
        payment: true,
        session: { select: { id: true, registerId: true } },
        table: { select: { id: true, tableNumber: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /* ────────────── CREATE DRAFT ────────────── */

  async create(dto: CreateOrderDto, sessionId: string) {
    // Verify table exists, and reuse the table's existing draft if one is open.
    // An active order belongs to the TABLE, not the employee — any cashier may
    // continue it rather than spawning a duplicate draft (PRD §7.4).
    if (dto.tableId) {
      const table = await this.prisma.table.findUnique({ where: { id: dto.tableId } });
      if (!table) throw new NotFoundException('Table not found');

      const existingDraft = await this.prisma.order.findFirst({
        where: { tableId: dto.tableId, status: 'DRAFT' },
        include: { lines: true, customer: true },
        orderBy: { createdAt: 'asc' },
      });
      if (existingDraft) {
        return existingDraft;
      }
    }

    const order = await this.prisma.order.create({
      data: {
        sessionId,
        tableId: dto.tableId ?? null,
      },
      include: { lines: true, customer: true },
    });

    // Emit table occupied
    if (order.tableId) {
      this.emitTableStatus(order.tableId, TableStatus.OCCUPIED);
      this.emitOrderUpdated(order);
    }

    return order;
  }

  /* ────────────── UPDATE (lines/customer, optimistic locking) ────────────── */

  async update(id: string, dto: UpdateOrderDto) {
    // Everything runs in one transaction so a failed line rebuild never leaves
    // the order half-updated, and the version check is enforced ATOMICALLY at the
    // final write (read-then-write would be a TOCTOU race — PRD §16.2).
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { lines: true } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'DRAFT') {
        throw new UnprocessableEntityException(
          `Cannot modify an order with status "${order.status}". Only DRAFT orders can be edited.`,
        );
      }
      // Fast-fail with a clear message; the real guard is the version-scoped
      // updateMany below (so concurrent writers can't both win).
      if (order.version !== dto.version) {
        throw new ConflictException(
          `Order has been modified by another terminal (expected version ${dto.version}, current ${order.version})`,
        );
      }

      // Validate customer if provided
      if (dto.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
        if (!customer) throw new NotFoundException('Customer not found');
      }

      // Replace lines if provided
      if (dto.lines) {
        await tx.orderLine.deleteMany({ where: { orderId: id } });
        for (const lineInput of dto.lines) {
          const product = await tx.product.findUnique({ where: { id: lineInput.productId } });
          if (!product) throw new NotFoundException(`Product ${lineInput.productId} not found`);

          const unitPrice =
            lineInput.unitPrice != null ? new Prisma.Decimal(lineInput.unitPrice) : product.price;
          const quantity = new Prisma.Decimal(lineInput.quantity);
          const lineTotal = unitPrice
            .mul(quantity)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

          await tx.orderLine.create({
            data: {
              orderId: id,
              productId: product.id,
              productName: product.name,
              unitPrice,
              taxPercent: product.taxPercent,
              quantity,
              lineTotal,
            },
          });
        }
      }

      // Recompute totals from the final lines via the pricing engine.
      const finalLines = await tx.orderLine.findMany({ where: { orderId: id } });
      const promotions = await tx.promotion.findMany({ where: { active: true } });
      const result = this.computeTotals(finalLines, order.appliedPromotionId, promotions);

      // Atomic optimistic-lock guard: only matches if the version is still the one
      // the client read. A concurrent committed update flips the version → count 0.
      const claim = await tx.order.updateMany({
        where: { id, version: dto.version, status: 'DRAFT' },
        data: {
          subtotal: result.subtotal,
          discountTotal: result.discountTotal,
          taxTotal: result.taxTotal,
          total: result.total,
          appliedPromotionId: result.appliedPromotionId,
          version: { increment: 1 },
          ...(dto.customerId !== undefined ? { customerId: dto.customerId || null } : {}),
        },
      });
      if (claim.count === 0) {
        throw new ConflictException('Order has been modified by another terminal');
      }

      return tx.order.findUnique({
        where: { id },
        include: { lines: true, customer: true, payment: true },
      });
    });

    // Emit updates after the transaction commits.
    if (updatedOrder) {
      this.emitOrderUpdated(updatedOrder);
      if (updatedOrder.tableId) {
        this.emitTableStatus(updatedOrder.tableId, TableStatus.OCCUPIED);
      }
    }

    return updatedOrder;
  }

  /* ────────────── APPLY COUPON ────────────── */

  async applyCoupon(id: string, dto: ApplyCouponDto) {
    const order = await this.getOrderOrFail(id);
    this.ensureDraft(order);

    // Validate coupon exists and is active
    const coupon = await this.prisma.promotion.findFirst({
      where: { code: dto.code, type: 'COUPON', active: true },
    });
    if (!coupon) {
      throw new UnprocessableEntityException('Invalid or inactive coupon code');
    }

    // Store the coupon code on order and recompute
    await this.prisma.order.update({
      where: { id },
      data: { appliedPromotionId: coupon.id },
    });

    return this.recomputeAndSave(id);
  }

  /* ────────────── CLEAR DISCOUNT ────────────── */

  async clearDiscount(id: string) {
    const order = await this.getOrderOrFail(id);
    this.ensureDraft(order);

    await this.prisma.order.update({
      where: { id },
      data: { appliedPromotionId: null },
    });

    return this.recomputeAndSave(id);
  }

  /* ────────────── SEND TO KITCHEN (PRD §7.6) ────────────── */

  async sendToKitchen(id: string) {
    const order = await this.getOrderOrFail(id);
    this.ensureDraft(order);

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        kdsStage: 'TO_COOK',
        sentToKitchenAt: new Date(),
      },
      include: {
        lines: {
          include: { product: { select: { showOnKds: true } } },
        },
      },
    });

    // Emit KDS ticket (only showOnKds lines)
    const kdsLines = updated.lines.filter((l) => l.product.showOnKds);
    const ticket: KdsTicket = {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      stage: KdsStage.TO_COOK,
      sentToKitchenAt: updated.sentToKitchenAt ? updated.sentToKitchenAt.toISOString() : null,
      lines: kdsLines.map((l) => ({
        orderLineId: l.id,
        name: l.productName,
        quantity: Number(l.quantity),
        completed: l.itemCompleted,
      })),
    };
    this.realtime.emitKdsTicketNew(ticket);

    // Emit table occupied
    if (updated.tableId) {
      this.emitTableStatus(updated.tableId, TableStatus.OCCUPIED);
    }

    return updated;
  }

  /* ────────────── CASH PAYMENT (PRD §13.11) ────────────── */

  async payCash(id: string, cashReceived: number) {
    const order = await this.getOrderOrFail(id);
    this.ensureDraft(order);

    // Money comparison in Decimal, never float (PRD §16.3).
    const received = new Prisma.Decimal(cashReceived);
    if (received.lt(order.total)) {
      throw new UnprocessableEntityException(
        `Cash received (${received.toFixed(2)}) is less than order total (${order.total.toFixed(2)})`,
      );
    }

    const changeDue = received.sub(order.total);

    // Upsert payment (tolerate a prior PENDING Razorpay record on this order).
    await this.prisma.payment.upsert({
      where: { orderId: id },
      update: {
        type: 'CASH',
        status: 'SUCCESS',
        amount: order.total,
        cashReceived: received,
        changeDue,
        reference: 'Cash',
      },
      create: {
        orderId: id,
        type: 'CASH',
        status: 'SUCCESS',
        amount: order.total,
        cashReceived: received,
        changeDue,
        reference: 'Cash',
      },
    });

    // Mark paid
    const paidOrder = await this.markPaid(id);

    return {
      order: paidOrder,
      cashReceived: received,
      changeDue,
    };
  }

  /* ────────────── MARK PAID (exposed for Dev 2 Razorpay) ────────────── */

  async markPaid(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status === 'PAID') {
      return order; // already paid, idempotent
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        version: { increment: 1 },
      },
      include: { lines: true, payment: true, customer: true },
    });

    // Emit events
    this.emitOrderUpdated(updated);
    if (updated.tableId) {
      // Check if table still has draft orders
      let tableStatus = TableStatus.AVAILABLE;
      const draftOnTable = await this.prisma.order.count({
        where: { tableId: updated.tableId, status: 'DRAFT' },
      });
      if (draftOnTable > 0) {
        tableStatus = TableStatus.OCCUPIED;
      } else {
        const currentBooking = await this.prisma.booking.findFirst({
          where: {
            tableId: updated.tableId,
            status: BookingStatus.BOOKED,
            reservedAt: {
              gte: new Date(Date.now() - 2 * 60 * 60 * 1000),
              lte: new Date(Date.now() + 2 * 60 * 60 * 1000),
            },
          },
        });
        if (currentBooking) {
          tableStatus = TableStatus.RESERVED;
        }
      }
      this.emitTableStatus(updated.tableId, tableStatus);
    }

    // Emit KDS ticket removed if it was sent to kitchen
    if (updated.kdsStage !== 'NONE') {
      this.realtime.emitKdsTicketRemoved({ orderId });
    }

    return updated;
  }


  /* ────────────── CANCEL/DELETE (DRAFT only) ────────────── */

  async remove(id: string) {
    const order = await this.getOrderOrFail(id);
    this.ensureDraft(order);

    const cancelled = await this.prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { lines: true },
    });

    // Emit events
    this.emitOrderUpdated(cancelled);
    if (cancelled.tableId) {
      const draftOnTable = await this.prisma.order.count({
        where: { tableId: cancelled.tableId, status: 'DRAFT' },
      });
      this.emitTableStatus(
        cancelled.tableId,
        draftOnTable > 0 ? TableStatus.OCCUPIED : TableStatus.AVAILABLE,
      );
    }

    if (cancelled.kdsStage !== 'NONE') {
      this.realtime.emitKdsTicketRemoved({ orderId: id });
    }

    return cancelled;
  }

  /* ────────────── HELPERS ────────────── */

  private async getOrderOrFail(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private ensureDraft(order: { status: string }) {
    if (order.status !== 'DRAFT') {
      throw new UnprocessableEntityException(
        `Cannot modify an order with status "${order.status}". Only DRAFT orders can be edited.`,
      );
    }
  }

  /**
   * Recompute order totals using the pricing engine.
   * Reads lines + promotions from DB, computes, and saves.
   */
  private async recomputeAndSave(orderId: string, customerId?: string | null) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const promotions = await this.prisma.promotion.findMany({ where: { active: true } });
    const result = this.computeTotals(order.lines, order.appliedPromotionId, promotions);

    // Save computed totals + bump version
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal: result.subtotal,
        discountTotal: result.discountTotal,
        taxTotal: result.taxTotal,
        total: result.total,
        appliedPromotionId: result.appliedPromotionId,
        version: { increment: 1 },
        ...(customerId !== undefined ? { customerId: customerId || null } : {}),
      },
      include: { lines: true, customer: true, payment: true },
    });

    return updated;
  }

  /**
   * Map persisted lines + active promotions into the pure pricing engine and
   * compute server-authoritative totals (PRD §5/§7.1). Shared by update() and
   * recomputeAndSave() so both paths price identically.
   */
  private computeTotals(
    lines: {
      productId: string;
      unitPrice: Prisma.Decimal;
      quantity: Prisma.Decimal;
      taxPercent: Prisma.Decimal;
    }[],
    appliedPromotionId: string | null,
    promotions: {
      id: string;
      code: string | null;
      type: string;
      scope: string;
      productId: string | null;
      minQuantity: number | null;
      minOrderAmount: Prisma.Decimal | null;
      discountType: string;
      discountValue: Prisma.Decimal;
      active: boolean;
    }[],
  ): PricingResult {
    const cartLines: PricingCartLine[] = lines.map((l) => ({
      productId: l.productId,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      taxPercent: l.taxPercent,
    }));

    let appliedCouponCode: string | null = null;
    if (appliedPromotionId) {
      const applied = promotions.find((p) => p.id === appliedPromotionId);
      if (applied?.code) appliedCouponCode = applied.code;
    }

    const pricingPromos: PricingPromotion[] = promotions.map((p) => ({
      id: p.id,
      type: p.type as PricingPromotion['type'],
      scope: p.scope as PricingPromotion['scope'],
      code: p.code,
      productId: p.productId,
      minQuantity: p.minQuantity,
      minOrderAmount: p.minOrderAmount,
      discountType: p.discountType as PricingPromotion['discountType'],
      discountValue: p.discountValue,
      active: p.active,
    }));

    return this.pricing.calculate(cartLines, appliedCouponCode, pricingPromos);
  }

  private emitOrderUpdated(order: {
    id: string;
    tableId: string | null;
    status: string;
    total: Prisma.Decimal;
  }) {
    const payload: OrderUpdatedEvent = {
      orderId: order.id,
      tableId: order.tableId,
      status: order.status as OrderUpdatedEvent['status'],
      total: order.total.toString(),
    };
    this.realtime.emitOrderUpdated(payload);
  }

  private emitTableStatus(tableId: string, status: TableStatus) {
    const payload: TableStatusEvent = { tableId, status };
    this.realtime.emitTableStatus(payload);
  }


}

