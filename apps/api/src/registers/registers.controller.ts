import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@cafe-pos/types';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { RegistersService } from './registers.service';
import { CreateRegisterDto } from './dto/create-register.dto';

@ApiTags('registers')
@ApiBearerAuth()
@Controller('registers')
export class RegistersController {
  constructor(private readonly registersService: RegistersService) {}

  @Get()
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'List registers (PRD §13.9 / §7.3)' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.registersService.findAll(query);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a register (PRD §13.9 / §7.3)' })
  create(@Body() dto: CreateRegisterDto) {
    return this.registersService.create(dto);
  }
}
