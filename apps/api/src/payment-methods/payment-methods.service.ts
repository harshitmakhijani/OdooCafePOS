import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(_query: PaginationQueryDto) {
    // TODO(PRD §13.5 / §8.4): list payment methods (paginated, searchable).
    throw new NotImplementedException('payment-methods.findAll not implemented');
  }

  async create(_dto: CreatePaymentMethodDto) {
    // TODO(PRD §13.5 / §8.4): create a payment method.
    throw new NotImplementedException('payment-methods.create not implemented');
  }

  async update(_id: string, _dto: UpdatePaymentMethodDto) {
    // TODO(PRD §13.5 / §8.4): update / toggle active payment method.
    throw new NotImplementedException('payment-methods.update not implemented');
  }

  async remove(_id: string) {
    // TODO(PRD §13.5): delete a payment method.
    throw new NotImplementedException('payment-methods.remove not implemented');
  }
}
