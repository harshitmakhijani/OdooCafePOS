import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Paginated } from '../common/interceptors/response.interceptor';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, pageSize, search } = query;
    const where: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return new Paginated(items, {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  }

  async create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.ensureExists(id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // Preserve history: refuse to delete a customer referenced by orders/bookings
    // (Customer has no soft-delete flag) — avoids an FK 500 and orphaning records.
    const [orderCount, bookingCount] = await Promise.all([
      this.prisma.order.count({ where: { customerId: id } }),
      this.prisma.booking.count({ where: { customerId: id } }),
    ]);
    if (orderCount > 0 || bookingCount > 0) {
      throw new ConflictException(
        'Cannot delete a customer linked to existing orders or bookings',
      );
    }
    return this.prisma.customer.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
}
