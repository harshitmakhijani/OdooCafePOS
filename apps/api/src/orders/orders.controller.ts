import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@cafe-pos/types';
import { Roles } from '../common/decorators/roles.decorator';
import { OrdersService } from './orders.service';
import { OrderQueryDto } from './dto/order-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'List orders (PRD §13.10)' })
  findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Order detail with lines (PRD §13.10)' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Create DRAFT for a table (PRD §13.10)' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Update lines/customer; optimistic lock via version (PRD §13.10 / §16.2)' })
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Post(':id/apply-coupon')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Apply coupon (PRD §13.10 / §7.1)' })
  applyCoupon(@Param('id') id: string, @Body() dto: ApplyCouponDto) {
    return this.ordersService.applyCoupon(id, dto);
  }

  @Delete(':id/discount')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Clear applied discount (PRD §13.10)' })
  clearDiscount(@Param('id') id: string) {
    return this.ordersService.clearDiscount(id);
  }

  @Post(':id/send-to-kitchen')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Set kdsStage=TO_COOK, emit (PRD §13.10 / §7.6)' })
  sendToKitchen(@Param('id') id: string) {
    return this.ordersService.sendToKitchen(id);
  }

  @Delete(':id')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Cancel/delete a DRAFT (PRD §13.10)' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
