import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@cafe-pos/types';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@ApiTags('promotions')
@ApiBearerAuth()
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'List promotions (PRD §13.6)' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.promotionsService.findAll(query);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a promotion (PRD §13.6)' })
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a promotion (PRD §13.6)' })
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a promotion (PRD §13.6)' })
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }

  @Post('validate-coupon')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Validate coupon and return discount preview (PRD §7.1)' })
  validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.promotionsService.validateCoupon(dto);
  }
}
