import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderQueryDto } from './dto/order-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(_query: OrderQueryDto) {
    // TODO(PRD §13.10): list orders (filter sessionId, search).
    throw new NotImplementedException('orders.findAll not implemented');
  }

  async findOne(_id: string) {
    // TODO(PRD §13.10): order detail with lines.
    throw new NotImplementedException('orders.findOne not implemented');
  }

  async create(_dto: CreateOrderDto) {
    // TODO(PRD §13.10): create DRAFT for a table.
    throw new NotImplementedException('orders.create not implemented');
  }

  async update(_id: string, _dto: UpdateOrderDto) {
    // TODO(PRD §13.10 / §16.2): update lines/customer; optimistic lock via version.
    throw new NotImplementedException('orders.update not implemented');
  }

  async applyCoupon(_id: string, _dto: ApplyCouponDto) {
    // TODO(PRD §13.10 / §7.1): apply coupon.
    throw new NotImplementedException('orders.applyCoupon not implemented');
  }

  async clearDiscount(_id: string) {
    // TODO(PRD §13.10): clear applied discount.
    throw new NotImplementedException('orders.clearDiscount not implemented');
  }

  async sendToKitchen(_id: string) {
    // TODO(PRD §13.10 / §7.6): set kdsStage=TO_COOK, emit.
    throw new NotImplementedException('orders.sendToKitchen not implemented');
  }

  async remove(_id: string) {
    // TODO(PRD §13.10): cancel/delete a DRAFT.
    throw new NotImplementedException('orders.remove not implemented');
  }
}
