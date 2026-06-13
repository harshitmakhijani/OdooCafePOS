import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PricingService, type PricingCartLine, type PricingPromotion } from './pricing.service';
import { OrderQueryDto } from './dto/order-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { Paginated } from '../common/interceptors/response.interceptor';
import type { KdsTicket, OrderUpdatedEvent, TableStatusEvent } from '@cafe-pos/types';
import { KdsStage, TableStatus } from '@cafe-pos/types';

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
      if (!isNaN(parsed)) {
        orConditions.push({ orderNumber: parsed });
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
    // Verify table exists
    if (dto.tableId) {
      const table = await this.prisma.table.findUnique({ where: { id: dto.tableId } });
      if (!table) throw new NotFoundException('Table not found');
    }

    const order = await this.prisma.order.create({
      data: {
        sessionId,
        tableId: dto.tableId,
      },
      include: { lines: true, customer: true },
    });

    // Emit table occupied
    if (dto.tableId) {
      this.emitTableStatus(dto.tableId, TableStatus.OCCUPIED);
      this.emitOrderUpdated(order);
    }

    return order;
  }

  /* ────────────── UPDATE (lines/customer, optimistic locking) ────────────── */

  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.getOrderOrFail(id);
    this.ensureDraft(order);

    // Optimistic locking (PRD §16.2)
    if (order.version !== dto.version) {
      throw new ConflictException(
        `Order has been modified by another terminal (expected version ${dto.version}, current ${order.version})`,
      );
    }

    // Update customer if provided
    if (dto.customerId !== undefined) {
      if (dto.customerId) {
        const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
        if (!customer) throw new NotFoundException('Customer not found');
      }
    }

    // Replace lines if provided
    if (dto.lines) {
      // Delete existing lines
      await this.prisma.orderLine.deleteMany({ where: { orderId: id } });

      // Create new lines with product snapshots
      for (const lineInput of dto.lines) {
        const product = await this.prisma.product.findUnique({
          where: { id: lineInput.productId },
        });
        if (!product) throw new NotFoundException(`Product ${lineInput.productId} not found`);

        const unitPrice = lineInput.unitPrice != null
          ? new Prisma.Decimal(lineInput.unitPrice)
          : product.price;
        const quantity = new Prisma.Decimal(lineInput.quantity);
        const lineTotal = unitPrice.mul(quantity).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        await this.prisma.orderLine.create({
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

    // Recompute totals via pricing engine
    const updatedOrder = await this.recomputeAndSave(id, dto.customerId);

    // Emit updates
    this.emitOrderUpdated(updatedOrder);
    if (updatedOrder.tableId) {
      this.emitTableStatus(updatedOrder.tableId, TableStatus.OCCUPIED);
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

    const total = Number(order.total);
    if (cashReceived < total) {
      throw new UnprocessableEntityException(
        `Cash received (${cashReceived}) is less than order total (${total})`,
      );
    }

    const changeDue = new Prisma.Decimal(cashReceived).sub(order.total);

    // Create payment record
    await this.prisma.payment.create({
      data: {
        orderId: id,
        type: 'CASH',
        status: 'SUCCESS',
        amount: order.total,
        cashReceived: new Prisma.Decimal(cashReceived),
        changeDue,
      },
    });

    // Mark paid
    const paidOrder = await this.markPaid(id);

    return {
      order: paidOrder,
      cashReceived: new Prisma.Decimal(cashReceived),
      changeDue,
    };
  }

  /* ────────────── MARK PAID (exposed for Dev 2 Razorpay) ────────────── */

  async markPaid(orderId: string) {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        version: { increment: 1 },
      },
      include: { lines: true, payment: true, customer: true },
    });

    // Emit events
    this.emitOrderUpdated(order);
    if (order.tableId) {
      // Check if table still has draft orders
      const draftOnTable = await this.prisma.order.count({
        where: { tableId: order.tableId, status: 'DRAFT' },
      });
      this.emitTableStatus(
        order.tableId,
        draftOnTable > 0 ? TableStatus.OCCUPIED : TableStatus.AVAILABLE,
      );
    }

    // Emit KDS ticket removed if it was sent to kitchen
    if (order.kdsStage !== 'NONE') {
      this.realtime.emitKdsTicketRemoved({ orderId });
    }

    return order;
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

    // Build pricing input
    const cartLines: PricingCartLine[] = order.lines.map((l) => ({
      productId: l.productId,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      taxPercent: l.taxPercent,
    }));

    // Get all active promotions
    const promotions = await this.prisma.promotion.findMany({
      where: { active: true },
    });

    // Find the applied coupon code if any
    let appliedCouponCode: string | null = null;
    if (order.appliedPromotionId) {
      const appliedPromo = promotions.find((p) => p.id === order.appliedPromotionId);
      if (appliedPromo?.code) {
        appliedCouponCode = appliedPromo.code;
      }
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

    const result = this.pricing.calculate(cartLines, appliedCouponCode, pricingPromos);

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
