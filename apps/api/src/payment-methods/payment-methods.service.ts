import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { Paginated } from '../common/interceptors/response.interceptor';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, pageSize, search } = query;
    const where = {
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.paymentMethod.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentMethod.count({ where }),
    ]);

    return new Paginated(items, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  }

  async create(dto: CreatePaymentMethodDto) {
    // Validate: upiId required when type=UPI (PRD §8.4)
    this.validateUpiRule(dto);

    return this.prisma.paymentMethod.create({
      data: {
        name: dto.name,
        type: dto.type,
        upiId: dto.upiId,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePaymentMethodDto) {
    const existing = await this.ensureExists(id);
    // Re-validate UPI rule with merged data
    const merged = { ...existing, ...dto };
    this.validateUpiRule(merged);

    return this.prisma.paymentMethod.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.paymentMethod.delete({ where: { id } });
  }

  private validateUpiRule(data: { type?: string; upiId?: string | null }) {
    if (data.type === 'UPI' && !data.upiId) {
      throw new UnprocessableEntityException('UPI ID is required when type is UPI');
    }
  }

  private async ensureExists(id: string) {
    const pm = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!pm) throw new NotFoundException('Payment method not found');
    return pm;
  }
}
