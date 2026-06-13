import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@cafe-pos/types';
import { Roles } from '../common/decorators/roles.decorator';
import { PaymentMethodQueryDto } from './dto/payment-method-query.dto';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@ApiTags('payment-methods')
@ApiBearerAuth()
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'List payment methods (PRD §13.5)' })
  findAll(@Query() query: PaymentMethodQueryDto) {
    return this.paymentMethodsService.findAll(query);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a payment method (PRD §13.5)' })
  create(@Body() dto: CreatePaymentMethodDto) {
    return this.paymentMethodsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update / toggle active payment method (PRD §13.5)' })
  update(@Param('id') id: string, @Body() dto: UpdatePaymentMethodDto) {
    return this.paymentMethodsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a payment method (PRD §13.5)' })
  remove(@Param('id') id: string) {
    return this.paymentMethodsService.remove(id);
  }
}
