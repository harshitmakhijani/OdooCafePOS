import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@cafe-pos/types';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FloorsService } from './floors.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@ApiTags('floors')
@ApiBearerAuth()
@Controller('floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Get()
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'List floors with tables and derived status (PRD §13.7 / §8.6)' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.floorsService.findAll(query);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a floor (PRD §13.7 / §8.6)' })
  create(@Body() dto: CreateFloorDto) {
    return this.floorsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a floor (PRD §13.7 / §8.6)' })
  update(@Param('id') id: string, @Body() dto: UpdateFloorDto) {
    return this.floorsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove a floor (PRD §13.7)' })
  remove(@Param('id') id: string) {
    return this.floorsService.remove(id);
  }
}
