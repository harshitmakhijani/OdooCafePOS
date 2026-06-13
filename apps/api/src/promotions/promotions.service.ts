import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { Paginated } from '../common/interceptors/response.interceptor';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, pageSize, search } = query;
    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { code: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.promotion.count({ where }),
    ]);

    return new Paginated(items, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  }

  async create(dto: CreatePromotionDto) {
    // Validate conditional rules (PRD §8.5)
    this.validatePromotionRules(dto);

    // Code uniqueness — `Promotion.code` is @unique for any type, so check
    // whenever a code is supplied (not only COUPONs) to avoid a P2002 → 500.
    if (dto.code) {
      const existing = await this.prisma.promotion.findUnique({
        where: { code: dto.code },
      });
      if (existing) {
        throw new ConflictException('A promotion with this code already exists');
      }
    }

    try {
      return await this.prisma.promotion.create({
        data: {
          name: dto.name,
          type: dto.type,
          code: dto.code,
          scope: dto.scope ?? 'ORDER',
          productId: dto.productId,
          minQuantity: dto.minQuantity,
          minOrderAmount: dto.minOrderAmount,
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          active: dto.active ?? true,
          description: dto.description,
        },
      });
    } catch (err) {
      throw this.mapPrismaError(err);
    }
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const existing = await this.ensureExists(id);
    const merged = { ...existing, ...dto };
    this.validatePromotionRules(merged as CreatePromotionDto);

    // Check code uniqueness on update whenever a code is being set/changed.
    if (dto.code && dto.code !== existing.code) {
      const dup = await this.prisma.promotion.findUnique({ where: { code: dto.code } });
      if (dup && dup.id !== id) {
        throw new ConflictException('A promotion with this code already exists');
      }
    }

    try {
      return await this.prisma.promotion.update({ where: { id }, data: dto });
    } catch (err) {
      throw this.mapPrismaError(err);
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.promotion.delete({ where: { id } });
  }

  /**
   * POST /promotions/validate-coupon — validates the coupon against a given
   * order and returns the computed discount preview without persisting
   * (PRD §13.6).
   */
  async validateCoupon(dto: ValidateCouponDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { lines: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }

    const subtotal = order.lines.reduce(
      (acc, line) => acc.add(line.lineTotal),
      new Prisma.Decimal(0),
    );

    const promo = await this.prisma.promotion.findFirst({
      where: {
        code: dto.code,
        type: 'COUPON',
        active: true,
      },
    });

    if (!promo) {
      throw new UnprocessableEntityException('Invalid or inactive coupon code');
    }

    const discountAmount =
      promo.discountType === 'PERCENTAGE'
        ? subtotal.mul(promo.discountValue).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
        : Prisma.Decimal.min(promo.discountValue, subtotal);

    return {
      valid: true,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      subtotal,
      discountAmount,
    };
  }

  /** Validates conditional promotion rules per PRD §8.5 */
  private validatePromotionRules(dto: Partial<CreatePromotionDto>) {
    // COUPON → code required
    if (dto.type === 'COUPON' && !dto.code) {
      throw new UnprocessableEntityException('Coupon promotions require a code');
    }

    // AUTOMATED + PRODUCT → productId + minQuantity required
    if (dto.type === 'AUTOMATED' && dto.scope === 'PRODUCT') {
      if (!dto.productId) {
        throw new UnprocessableEntityException(
          'Product-scoped automated promotions require a productId',
        );
      }
      if (dto.minQuantity == null) {
        throw new UnprocessableEntityException(
          'Product-scoped automated promotions require a minQuantity',
        );
      }
    }

    // AUTOMATED + ORDER → minOrderAmount required
    if (dto.type === 'AUTOMATED' && dto.scope === 'ORDER') {
      if (dto.minOrderAmount == null) {
        throw new UnprocessableEntityException(
          'Order-scoped automated promotions require a minOrderAmount',
        );
      }
    }
  }

  private async ensureExists(id: string) {
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  /** Maps a Prisma unique-constraint violation (P2002) to a ConflictException. */
  private mapPrismaError(err: unknown): unknown {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return new ConflictException('A promotion with this code already exists');
    }
    return err;
  }
}
