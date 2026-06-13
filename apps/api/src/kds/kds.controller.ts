import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@cafe-pos/types';
import { Roles } from '../common/decorators/roles.decorator';
import { KdsService } from './kds.service';
import { KdsQueryDto } from './dto/kds-query.dto';

@ApiTags('kds')
@ApiBearerAuth()
@Controller('kds')
export class KdsController {
  constructor(private readonly kdsService: KdsService) {}

  @Get('tickets')
  @Roles(Role.KITCHEN, Role.ADMIN)
  @ApiOperation({ summary: 'List active KDS tickets' })
  findTickets(@Query() query: KdsQueryDto) {
    return this.kdsService.findTickets(query);
  }

  @Patch('tickets/:orderId/advance')
  @Roles(Role.KITCHEN, Role.ADMIN)
  @ApiOperation({ summary: 'Advance a ticket to the next stage' })
  advance(@Param('orderId') orderId: string) {
    return this.kdsService.advance(orderId);
  }

  @Patch('lines/:orderLineId/toggle')
  @Roles(Role.KITCHEN, Role.ADMIN)
  @ApiOperation({ summary: 'Toggle the completed state of an order line' })
  toggleLine(@Param('orderLineId') orderLineId: string) {
    return this.kdsService.toggleLine(orderLineId);
  }
}
