import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(_query: PaginationQueryDto) {
    // TODO(PRD §13.8 / §9.9): list customers.
    throw new NotImplementedException('customers.findAll not implemented');
  }

  async create(_dto: CreateCustomerDto) {
    // TODO(PRD §13.8 / §9.9): create a customer.
    throw new NotImplementedException('customers.create not implemented');
  }

  async update(_id: string, _dto: UpdateCustomerDto) {
    // TODO(PRD §13.8 / §9.9): update a customer.
    throw new NotImplementedException('customers.update not implemented');
  }

  async remove(_id: string) {
    // TODO(PRD §13.8 / §9.9): remove a customer.
    throw new NotImplementedException('customers.remove not implemented');
  }
}
