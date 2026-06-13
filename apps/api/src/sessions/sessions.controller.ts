import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@cafe-pos/types';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SessionsService } from './sessions.service';
import { OpenSessionDto } from './dto/open-session.dto';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('current')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Get current open session + last-session info (PRD §13.9 / §7.3)' })
  getCurrent(@CurrentUser('sub') userId: string, @Query('registerId') registerId?: string) {
    return this.sessionsService.getCurrent(userId, registerId);
  }

  @Post('open')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Open a session on a register (PRD §13.9 / §7.3)' })
  open(@Body() dto: OpenSessionDto, @CurrentUser('sub') userId: string) {
    return this.sessionsService.open(dto, userId);
  }

  @Post(':id/close')
  @Roles(Role.CASHIER)
  @ApiOperation({ summary: 'Close session + return summary (PRD §13.9 / §7.3)' })
  close(@Param('id') id: string) {
    return this.sessionsService.close(id);
  }
}
