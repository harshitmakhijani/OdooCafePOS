import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KdsQueryDto } from './dto/kds-query.dto';

@Injectable()
export class KdsService {
  constructor(private readonly prisma: PrismaService) {}

  async findTickets(_query: KdsQueryDto) {
    // TODO(PRD §13.13): list active tickets, showOnKds only
    throw new NotImplementedException('kds.findTickets not implemented');
  }

  async advance(_orderId: string) {
    // TODO(PRD §13.13 / §7.6): advance ticket stage, emit event
    throw new NotImplementedException('kds.advance not implemented');
  }

  async toggleLine(_orderLineId: string) {
    // TODO(PRD §13.13 / §7.6): toggle itemCompleted, emit event
    throw new NotImplementedException('kds.toggleLine not implemented');
  }
}
