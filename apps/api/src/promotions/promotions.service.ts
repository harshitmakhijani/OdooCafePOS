import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(_query: PaginationQueryDto) {
    // TODO(PRD §13.6 / §8.5): list promotions (paginated, searchable).
    throw new NotImplementedException('promotions.findAll not implemented');
  }

  async create(_dto: CreatePromotionDto) {
    // TODO(PRD §13.6 / §8.5): create a promotion.
    throw new NotImplementedException('promotions.create not implemented');
  }

  async update(_id: string, _dto: UpdatePromotionDto) {
    // TODO(PRD §13.6 / §8.5): update a promotion.
    throw new NotImplementedException('promotions.update not implemented');
  }

  async remove(_id: string) {
    // TODO(PRD §13.6): delete a promotion.
    throw new NotImplementedException('promotions.remove not implemented');
  }

  async validateCoupon(_dto: ValidateCouponDto) {
    // TODO(PRD §13.6 / §7.1): validate coupon, return discount preview.
    throw new NotImplementedException('promotions.validateCoupon not implemented');
  }
}
