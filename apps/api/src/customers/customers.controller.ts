import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@cafe-pos/types';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'List customers (PRD §13.8 / §9.9)' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.customersService.findAll(query);
  }

  @Post()
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Create a customer (PRD §13.8 / §9.9)' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Update a customer (PRD §13.8 / §9.9)' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Remove a customer (PRD §13.8 / §9.9)' })
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
