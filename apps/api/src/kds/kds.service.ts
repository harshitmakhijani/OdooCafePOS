import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KdsQueryDto } from './dto/kds-query.dto';
import { KdsStage } from '@cafe-pos/types';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Paginated } from '../common/interceptors/response.interceptor';

@Injectable()
export class KdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async findTickets(query: KdsQueryDto) {
    const { search, page, pageSize, stage, productId, categoryId } = query;
    const skip = (page - 1) * pageSize;

    // A ticket must have at least one KDS-visible line; product/category filters
    // compose into that same predicate (so passing both no longer overwrites the
    // other), and showOnKds is enforced at the ORDER level so all-hidden orders
    // never appear and the count stays accurate (PRD §7.6/§10/§13.13).
    const lineFilter: Prisma.OrderLineWhereInput = {
      product: {
        showOnKds: true,
        ...(categoryId ? { categoryId } : {}),
      },
      ...(productId ? { productId } : {}),
    };

    const where: Prisma.OrderWhereInput = {
      // By default, only show active KDS tickets (exclude NONE)
      kdsStage: stage ?? {
        in: [KdsStage.TO_COOK, KdsStage.PREPARING],
      },
      lines: { some: lineFilter },
    };

    if (search) {
      const searchNum = parseInt(search, 10);
      if (!isNaN(searchNum)) {
        where.orderNumber = searchNum;
      }
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          lines: {
            where: {
              product: { showOnKds: true },
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: { sentToKitchenAt: 'asc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    const tickets = orders.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      stage: o.kdsStage as KdsStage,
      lines: o.lines.map((l) => ({
        orderLineId: l.id,
        name: l.productName,
        quantity: Number(l.quantity),
        completed: l.itemCompleted,
      })),
    }));

    // Return via Paginated so the global interceptor wraps once → { data, meta }.
    // (Returning a bare { data, meta } here would be double-wrapped.)
    return new Paginated(tickets, {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  }

  async advance(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    let nextStage: KdsStage;
    if (order.kdsStage === KdsStage.TO_COOK) {
      nextStage = KdsStage.PREPARING;
    } else if (order.kdsStage === KdsStage.PREPARING) {
      nextStage = KdsStage.COMPLETED;
    } else {
      throw new ConflictException(
        `Order ${orderId} cannot be advanced from stage ${order.kdsStage}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { kdsStage: nextStage },
      include: {
        lines: {
          where: {
            product: { showOnKds: true },
          },
        },
      },
    });

    const ticket = {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      stage: updated.kdsStage as KdsStage,
      lines: updated.lines.map((l) => ({
        orderLineId: l.id,
        name: l.productName,
        quantity: Number(l.quantity),
        completed: l.itemCompleted,
      })),
    };

    if (nextStage === KdsStage.COMPLETED) {
      // Remove completed tickets from the active display list
      this.realtimeGateway.emitKdsTicketRemoved({ orderId: updated.id });
    } else {
      this.realtimeGateway.emitKdsTicketUpdated(ticket);
    }

    return ticket;
  }

  async toggleLine(orderLineId: string) {
    const line = await this.prisma.orderLine.findUnique({
      where: { id: orderLineId },
    });
    if (!line) {
      throw new NotFoundException(`Order line ${orderLineId} not found`);
    }

    const updatedLine = await this.prisma.orderLine.update({
      where: { id: orderLineId },
      data: { itemCompleted: !line.itemCompleted },
    });

    const order = await this.prisma.order.findUnique({
      where: { id: updatedLine.orderId },
      include: {
        lines: {
          where: {
            product: { showOnKds: true },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${updatedLine.orderId} not found`);
    }

    const ticket = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      stage: order.kdsStage as KdsStage,
      lines: order.lines.map((l) => ({
        orderLineId: l.id,
        name: l.productName,
        quantity: Number(l.quantity),
        completed: l.itemCompleted,
      })),
    };

    this.realtimeGateway.emitKdsTicketUpdated(ticket);

    return ticket;
  }
}

