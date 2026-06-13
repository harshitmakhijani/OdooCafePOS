import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
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

    // COUPON code uniqueness
    if (dto.type === 'COUPON' && dto.code) {
      const existing = await this.prisma.promotion.findUnique({
        where: { code: dto.code },
      });
      if (existing) {
        throw new ConflictException(`Coupon code "${dto.code}" is already in use`);
      }
    }

    return this.prisma.promotion.create({
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
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const existing = await this.ensureExists(id);
    const merged = { ...existing, ...dto };
    this.validatePromotionRules(merged as CreatePromotionDto);

    // Check code uniqueness on update
    if (dto.code && dto.code !== existing.code) {
      const dup = await this.prisma.promotion.findUnique({ where: { code: dto.code } });
      if (dup && dup.id !== id) {
        throw new ConflictException(`Coupon code "${dto.code}" is already in use`);
      }
    }

    return this.prisma.promotion.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.promotion.delete({ where: { id } });
  }

  /**
   * POST /promotions/validate-coupon — returns a discount preview without persisting.
   */
  async validateCoupon(dto: ValidateCouponDto) {
    const promo = await this.prisma.promotion.findFirst({
      where: {
        code: dto.code,
        type: 'COUPON',
        active: true,
      },
    });

    if (!promo) {
      throw new NotFoundException('Invalid or inactive coupon code');
    }

    return {
      promotionId: promo.id,
      name: promo.name,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      description: promo.description,
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
}
